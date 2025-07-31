const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 10;

module.exports = {
  getAccesos: async (page = 1, limit = 10, search = '') => {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT a.*, CONCAT(e.nombres, ' ', e.apellidos) as empleado 
       FROM acceso a
       JOIN empleado e ON a.dni = e.dni
       WHERE e.nombres LIKE ? OR e.apellidos LIKE ? OR a.dni LIKE ?
       LIMIT ? OFFSET ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`, limit, offset]
    );

    const [count] = await pool.query(
      `SELECT COUNT(*) as total 
       FROM acceso a
       JOIN empleado e ON a.dni = e.dni
       WHERE e.nombres LIKE ? OR e.apellidos LIKE ? OR a.dni LIKE ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`]
    );

    return { 
      accesos: rows, 
      total: count[0].total,
      page,
      totalPages: Math.ceil(count[0].total / limit)
    };
  },

  getAccesoById: async (dni) => {
    const [rows] = await pool.query(
      `SELECT a.*, CONCAT(e.nombres, ' ', e.apellidos) as empleado 
       FROM acceso a
       JOIN empleado e ON a.dni = e.dni
       WHERE a.dni = ?`, 
      [dni]
    );
    return rows[0];
  },

  createAcceso: async (dni, password, tipo) => {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query(
      `INSERT INTO acceso (dni, password, tipo) 
       VALUES (?, ?, ?)`,
      [dni, hashedPassword, tipo]
    );
  },

  updateAcceso: async (dni, password, tipo) => {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      await pool.query(
        'UPDATE acceso SET password = ?, tipo = ? WHERE dni = ?',
        [hashedPassword, tipo, dni]
      );
    } else {
      await pool.query(
        'UPDATE acceso SET tipo = ? WHERE dni = ?',
        [tipo, dni]
      );
    }
  },

  deleteAcceso: async (dni) => {
    await pool.query('DELETE FROM acceso WHERE dni = ?', [dni]);
  },

  // bulkDeleteAccesos: async (dniList) => {
  //   await pool.query('DELETE FROM acceso WHERE dni IN (?)', [dniList]);
  // },

  getEmpleadosSinAcceso: async () => {
    const [rows] = await pool.query(
      `SELECT e.* FROM empleado e
       LEFT JOIN acceso a ON e.dni = a.dni
       WHERE a.dni IS NULL`
    );
    return rows;
  },
  // Add this to the exports
// getAllAccesos: async () => {
//   const [rows] = await pool.query(
//     `SELECT a.*, CONCAT(e.nombres, ' ', e.apellidos) as empleado 
//      FROM acceso a
//      JOIN empleado e ON a.dni = e.dni`
//   );
//   return rows;
// }
};