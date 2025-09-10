const pool = require('../config/database');

module.exports = {
  // Get paginated clients
  getClientes: async (page = 1, limit = 10, search = '') => {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT * FROM cliente 
       WHERE dni LIKE ? OR nombres LIKE ? OR apellidos LIKE ?
       LIMIT ? OFFSET ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`, limit, offset]
    );
    const [count] = await pool.query(
      `SELECT COUNT(*) as total FROM cliente 
       WHERE dni LIKE ? OR nombres LIKE ? OR apellidos LIKE ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`]
    );
    return { 
      clientes: rows, 
      total: count[0].total,
      page,
      totalPages: Math.ceil(count[0].total / limit)
    };
  },

  // Get single client by DNI
  getClienteByDni: async (dni) => {
    const [rows] = await pool.query('SELECT * FROM cliente WHERE dni = ?', [dni]);
    return rows[0];
  },

  // Create new client
  createCliente: async (dni, nombres, apellidos, sexo) => {
    const [result] = await pool.query(
      `INSERT INTO cliente (dni, nombres, apellidos, sexo) 
       VALUES (?, ?, ?, ?)`,
      [dni, nombres, apellidos, sexo]
    );
    return result.insertId;
  },
  
  // Update client
  updateCliente: async (dni, nombres, apellidos, sexo) => {
    await pool.query(
      'UPDATE cliente SET nombres = ?, apellidos = ?, sexo = ? WHERE dni = ?',
      [nombres, apellidos, sexo, dni]
    );
  },

  // Delete client
  deleteCliente: async (dni) => {
    await pool.query('DELETE FROM cliente WHERE dni = ?', [dni]);
  },

  // Bulk delete clients
  // bulkDeleteClientes: async (dnis) => {
  //   await pool.query('DELETE FROM cliente WHERE dni IN (?)', [dnis]);
  // },

  // Export to Excel
  getAllClientes: async () => {
    const [rows] = await pool.query('SELECT * FROM cliente ORDER BY apellidos, nombres');
    return rows;
  }
};