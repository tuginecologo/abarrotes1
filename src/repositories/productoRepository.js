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

  // productoRepository.js - agregar después de getProducts
getProductByIdExacto: async (id, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const idClean = String(id).trim();  // Limpiar espacios
  const [rows] = await pool.query(
    'SELECT * FROM producto WHERE TRIM(id_producto) = ? LIMIT ? OFFSET ?',
    [idClean, limit, offset]
  );
  const [count] = await pool.query(
    'SELECT COUNT(*) as total FROM producto WHERE TRIM(id_producto) = ?',
    [idClean]
  );
  console.log(`Búsqueda por ID: "${idClean}", filas encontradas: ${rows.length}`);
  return { rows, total: count[0].total };
},

// Create a new product
createProduct: async (productData) => {
  try {
    const [result] = await pool.query(
      // Add id_producto to the query
      'INSERT INTO producto (id_producto, nombre, marca, variante, descripcion, fecha) VALUES (?, ?, ?, ?, ?, NOW())',
      [
        productData.id_producto, // Add the barcode ID
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

 // productoRepository.js - Add these methods

// Image methods
getProductImages: async (idProducto) => {
  const [rows] = await pool.query(
    'SELECT * FROM producto_imagen WHERE id_producto = ? ORDER BY fecha_creacion DESC',
    [idProducto]
  );
  return rows;
},

addProductImage: async (idProducto, imagePath) => {
  const [result] = await pool.query(
    'INSERT INTO producto_imagen (id_producto, imagen_path) VALUES (?, ?)',
    [idProducto, imagePath]
  );
  return result.insertId;
},

deleteProductImage: async (idImagen) => {
  await pool.query(
    'DELETE FROM producto_imagen WHERE id_imagen = ?',
    [idImagen]
  );
},

// Video methods
getProductVideos: async (idProducto) => {
  const [rows] = await pool.query(
    'SELECT * FROM producto_video WHERE id_producto = ? ORDER BY fecha_creacion DESC',
    [idProducto]
  );
  return rows;
},

addProductVideo: async (idProducto, videoUrl) => {
  const [result] = await pool.query(
    'INSERT INTO producto_video (id_producto, video_url) VALUES (?, ?)',
    [idProducto, videoUrl]
  );
  return result.insertId;
},

deleteProductVideo: async (idVideo) => {
  await pool.query(
    'DELETE FROM producto_video WHERE id_video = ?',
    [idVideo]
  );
}
};