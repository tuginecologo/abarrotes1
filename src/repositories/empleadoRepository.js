const pool = require('../config/database');

module.exports = {
  // Get paginated employees
  getEmpleados: async (page, limit, search) => {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
        `SELECT 
            e.dni,
            e.nombres,
            e.apellidos,
            e.fecnac,
            e.sexo,
            c.nombre as cargo_nombre,
            fc.fecini
         FROM empleado e
         JOIN contrato co ON e.dni = co.dni AND co.status = 1
         JOIN cargo c ON co.id_cargo = c.id_cargo
         JOIN fecha_contrato fc ON co.id_contrato = fc.id_contrato
         WHERE (e.nombres LIKE ? OR e.apellidos LIKE ? OR e.dni LIKE ?)
         LIMIT ? OFFSET ?`,
        [`%${search}%`, `%${search}%`, `%${search}%`, limit, offset]
    );
    
    const [count] = await pool.query(
        `SELECT COUNT(*) as total 
         FROM empleado e
         JOIN contrato co ON e.dni = co.dni AND co.status = 1
         WHERE (e.nombres LIKE ? OR e.apellidos LIKE ? OR e.dni LIKE ?)`,
        [`%${search}%`, `%${search}%`, `%${search}%`]
    );
    
    return { 
        empleados: rows, 
        total: count[0].total,
        page,
        totalPages: Math.ceil(count[0].total / limit)
    };
},

  // Get single employee
// empleadoRepository.js
getEmpleadoById: async (dni) => {
  const [rows] = await pool.query(
    `SELECT 
        e.*,
        c.nombre as cargo_nombre,
        co.id_contrato,
        fc.fecini
     FROM empleado e
     JOIN contrato co ON e.dni = co.dni
     JOIN cargo c ON co.id_cargo = c.id_cargo
     JOIN fecha_contrato fc ON co.id_contrato = fc.id_contrato
     WHERE e.dni = ?
     ORDER BY co.id_contrato DESC LIMIT 1`,
    [dni]
  );
  return rows[0]; // Just return the result, no recursion!
},
  // Create employee
  createEmpleado: async (empleadoData) => {
    const [result] = await pool.query(
      `INSERT INTO empleado (dni, nombres, apellidos, fecnac, sexo, id_cargo, fecini) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        empleadoData.dni, 
        empleadoData.nombres, 
        empleadoData.apellidos, 
        empleadoData.fecnac, 
        empleadoData.sexo, 
        empleadoData.id_cargo, 
        empleadoData.fecini,
        
      ]
    );
    return empleadoData.dni;
},

  // Update employee
  updateEmpleado: async (dni, nombres, apellidos, fecnac, sexo) => {
    await pool.query(
        `UPDATE empleado 
         SET nombres = ?, apellidos = ?, fecnac = ?, sexo = ?
         WHERE dni = ?`,
        [nombres, apellidos, fecnac, sexo, dni]
    );
},

  // Delete employee
  deleteEmpleado: async (dni) => {
    await pool.query('DELETE FROM empleado WHERE dni = ?', [dni]);
  },

  // Bulk delete employees
  // bulkDeleteEmpleados: async (ids) => {
  //   await pool.query('DELETE FROM empleado WHERE dni IN (?)', [ids]);
  // },

  // Save employee image
  // saveEmpleadoImage: async (dni, imagePath) => {
  //   await pool.query(
  //     'UPDATE empleado SET imagen = ? WHERE dni = ?',
  //     [imagePath, dni]
  //   );
  // },

  // Get all cargos for dropdown
  getAllCargos: async () => {
    const [rows] = await pool.query('SELECT * FROM cargo');
    return rows;
  },

  createContrato: async (dni, id_cargo) => {
    const [result] = await pool.query(
        `INSERT INTO contrato (status, dni, id_cargo) 
         VALUES (1, ?, ?)`,
        [dni, id_cargo]
    );
    return result.insertId;
},

createFechaContrato: async (id_contrato, fecini) => {
    await pool.query(
        `INSERT INTO fecha_contrato (fecini, id_contrato)
         VALUES (?, ?)`,
        [fecini, id_contrato]
    );
},

terminateContrato: async (id_contrato, motivosalida) => {
    await pool.query(
        `UPDATE contrato SET status = 0, motivosalida = ?
         WHERE id_contrato = ?`,
        [motivosalida, id_contrato]
    );
},

setFechaFin: async (id_contrato, fecfin) => {
    await pool.query(
        `UPDATE fecha_contrato SET fecfin = ?
         WHERE id_contrato = ? AND fecfin IS NULL`,
        [fecfin, id_contrato]
    );
},

getActiveContrato: async (dni) => {
    const [rows] = await pool.query(
        `SELECT c.* FROM contrato c
         WHERE c.dni = ? AND c.status = 1
         ORDER BY c.id_contrato DESC LIMIT 1`,
        [dni]
    );
    return rows[0];
},
updateEmpleadoCargo: async (dni, id_cargo) => {
  // Get current active contract
  const [contract] = await pool.query(
      `SELECT id_contrato FROM contrato 
       WHERE dni = ? AND status = 1
       ORDER BY id_contrato DESC LIMIT 1`,
      [dni]
  );

  if (contract.length > 0) {
      await pool.query(
          `UPDATE contrato SET id_cargo = ?
           WHERE id_contrato = ?`,
          [id_cargo, contract[0].id_contrato]
      );
  }
},
getExEmpleados: async (page = 1, limit = 10, search = '') => {
  const offset = (page - 1) * limit;
  const [rows] = await pool.query(
      `SELECT 
          e.dni,
          e.nombres,
          e.apellidos,
          e.fecnac,
          e.sexo,
          MAX(c.nombre) as cargo_nombre,
          MAX(fc.fecfin) as fecha_salida,
          MAX(co.motivosalida) as motivosalida
       FROM empleado e
       JOIN contrato co ON e.dni = co.dni
       JOIN cargo c ON co.id_cargo = c.id_cargo
       JOIN fecha_contrato fc ON co.id_contrato = fc.id_contrato
       WHERE co.status = 0
       AND (e.nombres LIKE ? OR e.apellidos LIKE ? OR e.dni LIKE ?)
       GROUP BY e.dni, e.nombres, e.apellidos, e.fecnac, e.sexo
       LIMIT ? OFFSET ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`, limit, offset]
  );
  
  const [count] = await pool.query(
      `SELECT COUNT(DISTINCT e.dni) as total 
       FROM empleado e
       JOIN contrato co ON e.dni = co.dni
       WHERE co.status = 0
       AND (e.nombres LIKE ? OR e.apellidos LIKE ? OR e.dni LIKE ?)`,
      [`%${search}%`, `%${search}%`, `%${search}%`]
  );
  
  return { 
      empleados: rows, 
      total: count[0].total,
      page,
      totalPages: Math.ceil(count[0].total / limit)
  };
},
getEmpleadosSinAcceso: async () => {
  const [rows] = await pool.query(
    `SELECT e.* FROM empleado e
     LEFT JOIN acceso a ON e.dni = a.dni
     WHERE a.dni IS NULL`
  );
  return rows;
},


};