const pool = require('../config/database');

module.exports = {
  // Get paginated list of products with search
  getProducts: async (page, limit, search = '') => {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM producto';
    let countQuery = 'SELECT COUNT(*) as total FROM producto';
    const params = [];
    
    if (search) {
      query += ` WHERE nombre LIKE ? OR marca LIKE ? OR descripcion LIKE ?`;
      countQuery += ` WHERE nombre LIKE ? OR marca LIKE ? OR descripcion LIKE ?`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }
    
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const [rows] = await pool.query(query, params);
    const [[{ total }]] = await pool.query(countQuery, params.slice(0, -2));
    
    return { rows, total };
  },

  // Create a new product
  createProduct: async (productData) => {
    try {
      const [result] = await pool.query(
        'INSERT INTO producto (nombre, marca, variante, descripcion, fecha) VALUES (?, ?, ?, ?, NOW())',
        [
          productData.nombre, 
          productData.marca, 
          productData.variante, 
          productData.descripcion
        ]
      );
      return result.insertId;
    } catch (err) {
      console.error('Database error in createProduct:', err);
      throw err;
    }
  },

  // Get single product by ID
  getProductById: async (id) => {
    const [rows] = await pool.query(
      'SELECT * FROM producto WHERE id_producto = ?',
      [id]
    );
    return rows[0];
  },

  // Update product
  updateProduct: async (id, productData) => {
    await pool.query(
      'UPDATE producto SET nombre = ?, marca = ?, variante = ?, descripcion = ? WHERE id_producto = ?',
      [productData.nombre, productData.marca, productData.variante, productData.descripcion, id]
    );
  },

  // Delete product
  deleteProduct: async (id) => {
    await pool.query(
      'DELETE FROM producto WHERE id_producto = ?',
      [id]
    );
  },

  // Bulk delete products
  // bulkDeleteProducts: async (ids) => {
  //   await pool.query(
  //     'DELETE FROM producto WHERE id_producto IN (?)',
  //     [ids]
  //   );
  // }
};