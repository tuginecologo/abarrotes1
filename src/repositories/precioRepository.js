const pool = require('../config/database');

module.exports = {
// Get all public products with stock information
getPrecios: async (page = 1, limit = 10, search = '') => {
  const offset = (page - 1) * limit;
  
  const [rows] = await pool.query(
    `SELECT pp.id_precio, pp.precio, 
            p.id_producto, p.nombre, p.descripcion, p.variante, p.marca,
            IFNULL(s.cantidad, 0) as stock
     FROM precio pp
     JOIN producto p ON pp.id_producto = p.id_producto
     LEFT JOIN (
       SELECT id_producto, SUM(cantidad) as cantidad 
       FROM stock 
       GROUP BY id_producto
     ) s ON p.id_producto = s.id_producto
     WHERE p.nombre LIKE ? OR p.descripcion LIKE ? OR p.variante LIKE ? OR p.marca LIKE ?
     ORDER BY p.nombre
     LIMIT ? OFFSET ?`,
    [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, limit, offset]
  );
  
  const [count] = await pool.query(
    `SELECT COUNT(*) as total
     FROM precio pp
     JOIN producto p ON pp.id_producto = p.id_producto
     WHERE p.nombre LIKE ? OR p.descripcion LIKE ? OR p.variante LIKE ? OR p.marca LIKE ?`,
    [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
  );
  
  return { 
    productos: rows, 
    total: count[0].total,
    page,
    totalPages: Math.ceil(count[0].total / limit)
  };
},

getPrecioByIdExacto: async (id, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const [rows] = await pool.query(
    `SELECT pp.id_precio, pp.precio, 
            p.id_producto, p.nombre, p.descripcion, p.variante, p.marca,
            IFNULL(s.cantidad, 0) as stock
     FROM precio pp
     JOIN producto p ON pp.id_producto = p.id_producto
     LEFT JOIN (
       SELECT id_producto, SUM(cantidad) as cantidad 
       FROM stock 
       GROUP BY id_producto
     ) s ON p.id_producto = s.id_producto
     WHERE p.id_producto = ?
     ORDER BY p.nombre
     LIMIT ? OFFSET ?`,
    [String(id), limit, offset]
  );
  const [count] = await pool.query(
    `SELECT COUNT(*) as total
     FROM precio pp
     JOIN producto p ON pp.id_producto = p.id_producto
     WHERE p.id_producto = ?`,
    [String(id)]
  );
  return { 
    productos: rows, 
    total: count[0].total,
    page,
    totalPages: Math.ceil(count[0].total / limit)
  };
},

// Get single public product by ID
getPrecioById: async (id) => {
  const [rows] = await pool.query(
    `SELECT pp.*, p.id_producto, p.nombre, p.descripcion, p.variante, p.marca
     FROM precio pp
     JOIN producto p ON pp.id_producto = p.id_producto
     WHERE pp.id_precio = ?`,
    [id]
  );
  return rows[0];
},

  // Update product price
  updatePrecio: async (id, precio) => {
    await pool.query(
      'UPDATE precio SET precio = ? WHERE id_precio = ?',
      [precio, id]
    );
  },

// Get all products available for public listing
getAvailableProducts: async () => {
  const [rows] = await pool.query(
    `SELECT p.id_producto, p.nombre, p.variante, p.marca, p.descripcion
     FROM producto p
     LEFT JOIN precio pp ON p.id_producto = pp.id_producto
     WHERE pp.id_producto IS NULL
     ORDER BY p.nombre`
  );
  return rows;
},
  // Create new public product
  createPrecio: async (id_producto, precio) => {
    const [result] = await pool.query(
      'INSERT INTO precio (id_producto, precio) VALUES (?, ?)',
      [id_producto, precio]
    );
    return result.insertId;
  },

  // Delete public product
//   deleteProductoPublico: async (id) => {
//     await pool.query(
//       'DELETE FROM productopublico WHERE id_productopublico = ?',
//       [id]
//     );
//   }
};