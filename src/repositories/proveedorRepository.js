const pool = require('../config/database');

module.exports = {
  // Get paginated proveedores
  getProveedores: async (page = 1, limit = 10, search = '') => {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT * FROM proveedor 
       WHERE nombre LIKE ? OR ruc LIKE ? OR email LIKE ?
       LIMIT ? OFFSET ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`, limit, offset]
    );
    const [count] = await pool.query(
      `SELECT COUNT(*) as total FROM proveedor 
       WHERE nombre LIKE ? OR ruc LIKE ? OR email LIKE ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`]
    );
    return { 
      proveedores: rows, 
      total: count[0].total,
      page,
      totalPages: Math.ceil(count[0].total / limit)
    };
  },

  // Get single proveedor
  getProveedorById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM proveedor WHERE id_proveedor = ?', [id]);
    return rows[0];
  },

  // Create proveedor
  createProveedor: async (nombre, ruc, telefono, email) => {
    const [result] = await pool.query(
      `INSERT INTO proveedor (nombre, ruc, telefono, email) 
       VALUES (?, ?, ?, ?)`,
      [nombre, ruc, telefono, email]
    );
    return result.insertId;
  },
  
  // Update proveedor
  updateProveedor: async (id, nombre, ruc, telefono, email) => {
    await pool.query(
      'UPDATE proveedor SET nombre = ?, ruc = ?, telefono = ?, email = ? WHERE id_proveedor = ?',
      [nombre, ruc, telefono, email, id]
    );
  },

  // Delete proveedor
  deleteProveedor: async (id) => {
    await pool.query('DELETE FROM proveedor WHERE id_proveedor = ?', [id]);
  },

  // Bulk delete proveedores
  // bulkDeleteProveedores: async (ids) => {
  //   await pool.query('DELETE FROM proveedor WHERE id_proveedor IN (?)', [ids]);
  // },

  // Export to Excel
  getAllProveedores: async () => {
    const [rows] = await pool.query('SELECT * FROM proveedor');
    return rows;
  }
};