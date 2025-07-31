const pool = require('../config/database');

module.exports = {
  // Get paginated cargos
  getCargos: async (page = 1, limit = 10, search = '') => {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT * FROM cargo 
       WHERE nombre LIKE ? OR descripcion LIKE ?
       LIMIT ? OFFSET ?`,
      [`%${search}%`, `%${search}%`, limit, offset]
    );
    const [count] = await pool.query(
      `SELECT COUNT(*) as total FROM cargo 
       WHERE nombre LIKE ? OR descripcion LIKE ?`,
      [`%${search}%`, `%${search}%`]
    );
    return { 
      cargos: rows, 
      total: count[0].total,
      page,
      totalPages: Math.ceil(count[0].total / limit)
    };
  },

  // Get single cargo
  getCargoById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM cargo WHERE id_cargo = ?', [id]);
    return rows[0];
  },

// Update createCargo method
createCargo: async (nombre, descripcion, sueldo) => {
    const [result] = await pool.query(
      `INSERT INTO cargo (nombre, descripcion, sueldo) 
       VALUES (?, ?, ?)`,
      [nombre, descripcion, sueldo]
    );
    return result.insertId;
  },
  
  // Update updateCargo method
  updateCargo: async (id, nombre, descripcion, sueldo) => {
    await pool.query(
      'UPDATE cargo SET nombre = ?, descripcion = ?, sueldo = ? WHERE id_cargo = ?',
      [nombre, descripcion, sueldo, id]
    );
  },

  // Delete cargo
  deleteCargo: async (id) => {
    await pool.query('DELETE FROM cargo WHERE id_cargo = ?', [id]);
  },

  // Bulk delete cargos
  // bulkDeleteCargos: async (ids) => {
  //   await pool.query('DELETE FROM cargo WHERE id_cargo IN (?)', [ids]);
  // }
};