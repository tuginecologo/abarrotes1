const empleadoRepository = require('../repositories/empleadoRepository');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');

module.exports = {
  getEmpleados: async (page, limit, search) => {
    return empleadoRepository.getEmpleados(page, limit, search);
  },

  getEmpleadoById: async (dni) => {
    const empleado = await empleadoRepository.getEmpleadoById(dni);
    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }
    return empleado;
  },

  createEmpleado: async (empleadoData) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create employee (without id_cargo)
        await connection.query(
            `INSERT INTO empleado (dni, nombres, apellidos, fecnac, sexo)
             VALUES (?, ?, ?, ?, ?)`,
            [
              empleadoData.dni,
              empleadoData.nombres,
              empleadoData.apellidos,
              empleadoData.fecnac,
              empleadoData.sexo
            ]
        );

        // 2. Create contract
        const [contratoResult] = await connection.query(
            `INSERT INTO contrato (status, dni, id_cargo)
             VALUES (1, ?, ?)`,
            [empleadoData.dni, empleadoData.id_cargo]
        );

        // 3. Create contract dates
        await connection.query(
            `INSERT INTO fecha_contrato (fecini, id_contrato)
             VALUES (?, ?)`,
            [empleadoData.fecini, contratoResult.insertId]
        );

        await connection.commit();
        return empleadoData.dni;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
},

  // Keep all other methods exactly the same
// In empleadoService.js
updateEmpleado: async (dni, empleadoData) => {
  // Verify employee exists first
  const existing = await empleadoRepository.getEmpleadoById(dni);
  if (!existing) {
      throw new Error('Empleado no encontrado');
  }

  // Validate required fields
  const requiredFields = ['nombres', 'apellidos', 'fecnac', 'sexo'];
  for (const field of requiredFields) {
      if (!empleadoData[field]) {
          throw new Error(`Campo requerido faltante: ${field}`);
      }
  }

  // Update employee data
  await empleadoRepository.updateEmpleado(dni, empleadoData);

  // Update contract if cargo changed
  if (empleadoData.id_cargo && empleadoData.id_cargo !== existing.id_cargo) {
      await empleadoRepository.updateEmpleadoCargo(dni, empleadoData.id_cargo);
  }
},
  terminateEmpleado: async (dni, motivosalida) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get active contract
        const contrato = await empleadoRepository.getActiveContrato(dni, { connection });
        if (!contrato) {
            throw new Error('No active contract found for employee');
        }

        // 2. Terminate contract
        await empleadoRepository.terminateContrato(
            contrato.id_contrato,
            motivosalida,
            { connection }
        );

        // 3. Set end date
        await empleadoRepository.setFechaFin(
            contrato.id_contrato,
            new Date().toISOString().split('T')[0],
            { connection }
        );

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
},
  // bulkDeleteEmpleados: async function(empleadoIds) {
  //   try {
  //     console.log('Deleting empleados with IDs:', empleadoIds);
  //
  //     // Skip the image check and just delete from database
  //     const [result] = await pool.query(
  //       'DELETE FROM empleado WHERE dni IN (?)',
  //       [empleadoIds]
  //     );
  //
  //     return {
  //       success: true,
  //       count: result.affectedRows
  //     };
  //   } catch (err) {
  //     console.error('Database error:', err);
  //     throw err;
  //   }
  // },
//   saveEmpleadoImage: async (dni, imageFile) => {
//     try {
//         const uploadDir = path.join(__dirname, '../../public/uploads/empleados');
//         if (!fs.existsSync(uploadDir)) {
//             fs.mkdirSync(uploadDir, { recursive: true });
//         }

//         const filename = `empleado_${dni}${path.extname(imageFile.originalname)}`;
//         const uploadPath = path.join(uploadDir, filename);
//
//         await fs.promises.rename(imageFile.path, uploadPath);
//
//         return `/uploads/empleados/${filename}`;
//     } catch (err) {
//         console.error('Error saving image:', err);
//         throw err;
//     }
// },

  // deleteEmpleadoImage: async (dni) => {
  //   const [empleado] = await pool.query(
  //     'SELECT imagen FROM empleado WHERE dni = ?',
  //     [dni]
  //   );
  //
  //   if (empleado[0]?.imagen) {
  //     const imagePath = path.join(__dirname, '../public', empleado[0].imagen);
  //     try {
  //       await fs.promises.unlink(imagePath);
  //     } catch (err) {
  //       console.error('Error deleting old image:', err);
  //     }
  //   }
  // },

  getCargos: async () => {
    return empleadoRepository.getAllCargos();
  },

  exportToExcel: async () => {
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Empleados');

    const [empleados] = await pool.query(
      `SELECT e.*, c.nombre as cargo_nombre
       FROM empleado e
       JOIN cargo c ON e.id_cargo = c.id_cargo`
    );

    worksheet.columns = [
      { header: 'DNI', key: 'dni', width: 15 },
      { header: 'Nombres', key: 'nombres', width: 25 },
      { header: 'Apellidos', key: 'apellidos', width: 25 },
      { header: 'Fecha Nac.', key: 'fecnac', width: 15 },
      { header: 'Sexo', key: 'sexo', width: 10 },
      { header: 'Cargo', key: 'cargo_nombre', width: 25 },
      { header: 'Fecha Inicio', key: 'fecini', width: 15 }
    ];

    worksheet.addRows(empleados);

    const exportDir = path.join(__dirname, '../public/exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const exportPath = path.join(exportDir, 'empleados.xlsx');
    await workbook.xlsx.writeFile(exportPath);

    return exportPath;
  },
  // Add this method
  terminateEmpleado: async (dni, motivosalida, fecfin) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get active contract
        const [contract] = await connection.query(
            `SELECT id_contrato FROM contrato
             WHERE dni = ? AND status = 1
             ORDER BY id_contrato DESC LIMIT 1`,
            [dni]
        );

        if (contract.length === 0) {
            throw new Error('No active contract found');
        }

        // 2. Update contract status
        await connection.query(
            `UPDATE contrato
             SET status = 0, motivosalida = ?
             WHERE id_contrato = ?`,
            [motivosalida, contract[0].id_contrato]
        );

        // 3. Set end date (now using the provided date)
        await connection.query(
            `UPDATE fecha_contrato
             SET fecfin = ?
             WHERE id_contrato = ? AND fecfin IS NULL`,
            [fecfin, contract[0].id_contrato]
        );

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
},

getExEmpleados: async (page, limit, search) => {
  return empleadoRepository.getExEmpleados(page, limit, search);
},

rehireEmpleado: async (dni, id_cargo, fecini) => {
  const connection = await pool.getConnection();
  try {
      await connection.beginTransaction();

      // 1. Create new contract
      const [contratoResult] = await connection.query(
          `INSERT INTO contrato (status, dni, id_cargo)
           VALUES (1, ?, ?)`,
          [dni, id_cargo]
      );

      // 2. Create contract dates
      await connection.query(
          `INSERT INTO fecha_contrato (fecini, id_contrato)
           VALUES (?, ?)`,
          [fecini, contratoResult.insertId]
      );

      await connection.commit();
  } catch (err) {
      await connection.rollback();
      throw err;
  } finally {
      connection.release();
  }
},
getEmpleadosSinAcceso: async () => {
  return await empleadoRepository.getEmpleadosSinAcceso();
},

getEmpleadoByDni: async (dni) => {
  const [rows] = await pool.query('SELECT * FROM empleado WHERE dni = ?', [dni]);
  return rows[0] || null;
}
};