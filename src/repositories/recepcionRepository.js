const pool = require('../config/database');

module.exports = {
// Get paginated receptions with related data
getRecepciones: async (page = 1, limit = 10, search = '') => {
  const offset = (page - 1) * limit;
  const [rows] = await pool.query(
    `SELECT r.*, 
     p.id_producto, p.nombre as producto_nombre, 
     p.variante as producto_variante, p.marca as producto_marca,
     p.descripcion as producto_descripcion,
     pr.nombre as proveedor_nombre, 
     CONCAT(e.nombres, ' ', e.apellidos) as empleado_nombre 
     FROM recepcion r
     JOIN producto p ON r.id_producto = p.id_producto
     JOIN proveedor pr ON r.id_proveedor = pr.id_proveedor
     JOIN empleado e ON r.dni = e.dni
     WHERE p.nombre LIKE ? OR pr.nombre LIKE ? 
     OR CONCAT(e.nombres, ' ', e.apellidos) LIKE ? OR r.observacion LIKE ?
     ORDER BY r.id_recepcion DESC  -- <-- Cambio aquí
     LIMIT ? OFFSET ?`,
    [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, limit, offset]
  );
  
  const [count] = await pool.query(
    `SELECT COUNT(*) as total 
     FROM recepcion r
     JOIN producto p ON r.id_producto = p.id_producto
     JOIN proveedor pr ON r.id_proveedor = pr.id_proveedor
     JOIN empleado e ON r.dni = e.dni
     WHERE p.nombre LIKE ? OR pr.nombre LIKE ? 
     OR CONCAT(e.nombres, ' ', e.apellidos) LIKE ? OR r.observacion LIKE ?`,
    [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
  );
  
  return { 
    recepciones: rows, 
    total: count[0].total,
    page,
    totalPages: Math.ceil(count[0].total / limit)
  };
},

  // Get single reception by ID
  getRecepcionById: async (id) => {
    const [rows] = await pool.query(
      `SELECT r.*, p.nombre as producto_nombre, pr.nombre as proveedor_nombre, 
       CONCAT(e.nombres, ' ', e.apellidos) as empleado_nombre 
       FROM recepcion r
       JOIN producto p ON r.id_producto = p.id_producto
       JOIN proveedor pr ON r.id_proveedor = pr.id_proveedor
       JOIN empleado e ON r.dni = e.dni
       WHERE r.id_recepcion = ?`,
      [id]
    );
    return rows[0];
  },

  // Create reception
  createRecepcion: async (cantidad, id_producto, id_proveedor, dni, fecha, observacion, id_compra, { connection } = {}) => {
    const conn = connection || pool;
    const [result] = await conn.query(
      `INSERT INTO recepcion 
       (cantidad, id_producto, id_proveedor, dni, fecha, observacion, id_compra) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cantidad, id_producto, id_proveedor, dni, fecha, observacion, id_compra]
    );
    return result.insertId;
  },
  // In recepcionRepository.js - add this method
getCompraFecha: async (id_compra) => {
  const [rows] = await pool.query(
    'SELECT fecha FROM compra WHERE id_compra = ?',
    [id_compra]
  );
  return rows[0] ? rows[0].fecha : null;
},
  
  // Update reception
  updateRecepcion: async (id, cantidad, id_producto, id_proveedor, dni, fecha, observacion) => {
    await pool.query(
      `UPDATE recepcion 
       SET cantidad = ?, id_producto = ?, id_proveedor = ?, dni = ?, fecha = ?, observacion = ?
       WHERE id_recepcion = ?`,
      [cantidad, id_producto, id_proveedor, dni, fecha, observacion, id]
    );
  },

  // Delete reception
  deleteRecepcion: async (id) => {
    await pool.query('DELETE FROM recepcion WHERE id_recepcion = ?', [id]);
  },

  // Bulk delete receptions
  // bulkDeleteRecepciones: async (ids) => {
  //   await pool.query('DELETE FROM recepcion WHERE id_recepcion IN (?)', [ids]);
  // },

// Get all receptions for Excel export
getAllRecepciones: async () => {
  const [rows] = await pool.query(
    `SELECT r.*, 
     p.id_producto, p.nombre as producto_nombre, 
     p.variante as producto_variante, p.marca as producto_marca,
     p.descripcion as producto_descripcion,
     pr.nombre as proveedor_nombre, 
     CONCAT(e.nombres, ' ', e.apellidos) as empleado_nombre 
     FROM recepcion r
     JOIN producto p ON r.id_producto = p.id_producto
     JOIN proveedor pr ON r.id_proveedor = pr.id_proveedor
     JOIN empleado e ON r.dni = e.dni
     ORDER BY r.id_recepcion DESC  -- <-- Cambio aquí
     LIMIT ? OFFSET ?`
  );
  return rows;
},

// In recepcionRepository.js - update the getDropdownOptions query
getDropdownOptions: async () => {
  const [compras] = await pool.query(`
    SELECT c.id_compra, p.id_producto, p.nombre as producto_nombre, 
           p.variante as producto_variante, p.marca as producto_marca,
           p.descripcion as producto_descripcion,
           pr.nombre as proveedor_nombre, c.cantidad as cantidad_comprada,
           c.fecha as fecha_compra, c.preciounitario,
           CONCAT(e.nombres, ' ', e.apellidos) as comprador,
           c.id_proveedor
    FROM compra c
    JOIN producto p ON c.id_producto = p.id_producto
    JOIN proveedor pr ON c.id_proveedor = pr.id_proveedor
    JOIN empleado e ON c.dni = e.dni
    WHERE c.id_compra NOT IN (
      SELECT id_compra FROM recepcion WHERE id_compra IS NOT NULL
    )
    ORDER BY c.fecha DESC
  `);
  const [empleados] = await pool.query('SELECT dni, CONCAT(nombres, " ", apellidos) as nombre FROM empleado');
  
  // Add proveedores query
  const [proveedores] = await pool.query('SELECT id_proveedor, nombre FROM proveedor ORDER BY nombre');
  
  return {
    compras,
    empleados,
    proveedores // Include this in the returned object
  };
},
getProductosByProveedor: async (id_proveedor) => {
  const [productos] = await pool.query(`
    SELECT DISTINCT p.id_producto, p.nombre, p.variante, p.marca, p.descripcion
    FROM producto p
    JOIN compra c ON p.id_producto = c.id_producto
    WHERE c.id_proveedor = ?
    ORDER BY p.nombre
  `, [id_proveedor]);
  return productos;
},
  getCompraById: async (id_compra, { connection } = {}) => {
    const conn = connection || pool;
    const [rows] = await conn.query(
      `SELECT c.*, p.nombre as producto_nombre, pr.nombre as proveedor_nombre
       FROM compra c
       JOIN producto p ON c.id_producto = p.id_producto
       JOIN proveedor pr ON c.id_proveedor = pr.id_proveedor
       WHERE c.id_compra = ?`,
      [id_compra]
    );
    return rows[0];
  }
}