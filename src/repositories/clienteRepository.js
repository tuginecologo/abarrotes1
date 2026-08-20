const pool = require('../config/database');

module.exports = {
  // Paginación y búsqueda (busca por nombres/apellidos)
  getClientes: async (page = 1, limit = 10, search = '') => {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT id_cliente, nombres, apellidos, sexo 
       FROM cliente 
       WHERE nombres LIKE ? OR apellidos LIKE ?
       LIMIT ? OFFSET ?`,
      [`%${search}%`, `%${search}%`, limit, offset]
    );
    const [count] = await pool.query(
      `SELECT COUNT(*) as total FROM cliente 
       WHERE nombres LIKE ? OR apellidos LIKE ?`,
      [`%${search}%`, `%${search}%`]
    );
    return { 
      clientes: rows, 
      total: count[0].total,
      page,
      totalPages: Math.ceil(count[0].total / limit)
    };
  },

  // Obtener cliente por ID
  getClienteById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM cliente WHERE id_cliente = ?', [id]);
    return rows[0];
  },

  // Crear cliente (sin dni)
  createCliente: async (nombres, apellidos, sexo) => {
    const [result] = await pool.query(
      `INSERT INTO cliente (nombres, apellidos, sexo) 
       VALUES (?, ?, ?)`,
      [nombres, apellidos, sexo]
    );
    return result.insertId;
  },

  // Actualizar cliente por ID
  updateCliente: async (id, nombres, apellidos, sexo) => {
    await pool.query(
      'UPDATE cliente SET nombres = ?, apellidos = ?, sexo = ? WHERE id_cliente = ?',
      [nombres, apellidos, sexo, id]
    );
  },

  // Eliminar cliente por ID
  deleteCliente: async (id) => {
    await pool.query('DELETE FROM cliente WHERE id_cliente = ?', [id]);
  },

  // Obtener todos los clientes (para exportar)
  getAllClientes: async () => {
    const [rows] = await pool.query(
      'SELECT id_cliente, nombres, apellidos, sexo FROM cliente ORDER BY apellidos, nombres'
    );
    return rows;
  }
};