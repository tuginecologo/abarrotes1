const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 10;
const accesoRepository = require('../repositories/accesoRepository');
const empleadoService = require('../services/empleadoService');
// const excel = require('exceljs');
// const path = require('path');
// const fs = require('fs');
// const accesos = await accesoRepository.getAllAccesos();

module.exports = {
  getAccesos: async (page, limit, search) => {
    return await accesoRepository.getAccesos(page, limit, search);
  },

  getAccesoById: async (dni) => {
    const acceso = await accesoRepository.getAccesoById(dni);
    if (!acceso) {
      throw new Error('Acceso no encontrado');
    }
    return acceso;
  },

  createAcceso: async (accesoData) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Validate and clean DNI
      const dni = accesoData.dni.toString().trim();
      if (!/^\d{8}$/.test(dni)) {
        throw new Error('DNI debe tener exactamente 8 dígitos numéricos');
      }

      // Validate tipo
      if (!['0', '1', '2'].includes(accesoData.tipo)) {
        throw new Error('Tipo de acceso no válido (0: Total, 1: Admin, 2: Ventas)');
      }

      // Validate password length (before hashing)
      if (accesoData.password.length < 4) {
        throw new Error('La contraseña debe tener al menos 4 caracteres');
      }

      // Check employee exists
      const empleado = await empleadoService.getEmpleadoByDni(dni);
      if (!empleado) {
        throw new Error('Empleado no encontrado');
      }

      // Check access doesn't exist
      const [existing] = await connection.query(
        'SELECT 1 FROM acceso WHERE dni = ? LIMIT 1',
        [dni]
      );
      if (existing.length) {
        throw new Error('Este empleado ya tiene acceso');
      }

      // Hash password (this will always be 60 chars)
      const hashedPassword = await bcrypt.hash(accesoData.password, SALT_ROUNDS);

      // Create access
      await connection.query(
        `INSERT INTO acceso (dni, password, tipo)
         VALUES (?, ?, ?)`,
        [dni, hashedPassword, accesoData.tipo]
      );

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      console.error('Database error:', err);
      throw err;
    } finally {
      connection.release();
    }
  },

  updateAcceso: async (dni, accesoData) => {
    const acceso = await accesoRepository.getAccesoById(dni);
    if (!acceso) {
      throw new Error('Acceso no encontrado');
    }

    if (!['0', '1', '2'].includes(accesoData.tipo)) {
      throw new Error('Tipo de acceso no válido');
    }

    return await accesoRepository.updateAcceso(
      dni,
      accesoData.password,
      accesoData.tipo
    );
  },

  deleteAcceso: async (dni) => {
    return await accesoRepository.deleteAcceso(dni);
  },

  // bulkDeleteAccesos: async (dniList) => {
  //   if (!dniList || dniList.length === 0) {
  //     throw new Error('No se proporcionaron DNI de accesos');
  //   }
  //   return await accesoRepository.bulkDeleteAccesos(dniList);
  // },

  getAvailableEmpleados: async () => {
    return await accesoRepository.getEmpleadosSinAcceso();
  },
  // exportToExcel: async () => {
  //
  //   const workbook = new excel.Workbook();
  //   const worksheet = workbook.addWorksheet('Accesos');
  //
  //   // Get all accesos with employee names
  //   const [accesos] = await pool.query(
  //     `SELECT a.*, CONCAT(e.nombres, ' ', e.apellidos) as empleado
  //       FROM acceso a
  //       JOIN empleado e ON a.dni = e.dni`
  //   );
  //
  //   // Define columns
  //   worksheet.columns = [
  //     { header: 'DNI', key: 'dni', width: 15 },
  //     { header: 'Empleado', key: 'empleado', width: 30 },
  //     { header: 'Tipo de Acceso', key: 'tipo', width: 20 }
  //   ];
  //
  //   // Add rows with formatted tipo
  //   accesos.forEach(acceso => {
  //     const tipoText =
  //       acceso.tipo === '0' ? 'Total' :
  //       acceso.tipo === '1' ? 'Administrador' : 'Ventas';
  //
  //     worksheet.addRow({
  //       dni: acceso.dni,
  //       empleado: acceso.empleado,
  //       tipo: tipoText
  //     });
  //   });
  //
  //   // Create exports directory if it doesn't exist
  //   const exportDir = path.join(__dirname, '../public/exports');
  //   if (!fs.existsSync(exportDir)) {
  //     fs.mkdirSync(exportDir, { recursive: true });
  //   }
  //
  //   const exportPath = path.join(exportDir, 'accesos.xlsx');
  //   await workbook.xlsx.writeFile(exportPath);
  //
  //   return exportPath;
  // }
};