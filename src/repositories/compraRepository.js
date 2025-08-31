const pool = require('../config/database');

module.exports = {
    // Get paginated purchases with related data
// Get paginated purchases with related data
getCompras: async (page = 1, limit = 10, search = '') => {
  const offset = (page - 1) * limit;
  const [rows] = await pool.query(
    `SELECT c.*, 
     p.nombre as producto_nombre, 
     p.variante as producto_variante,
     p.marca as producto_marca,
     p.descripcion as producto_descripcion,
     pr.nombre as proveedor_nombre, 
     CONCAT(e.nombres, ' ', e.apellidos) as empleado_nombre 
     FROM compra c
     JOIN producto p ON c.id_producto = p.id_producto
     JOIN proveedor pr ON c.id_proveedor = pr.id_proveedor
     JOIN empleado e ON c.dni = e.dni
     WHERE p.nombre LIKE ? OR pr.nombre LIKE ? 
     OR CONCAT(e.nombres, ' ', e.apellidos) LIKE ? OR c.observacion LIKE ?
     ORDER BY c.fecha DESC
     LIMIT ? OFFSET ?`,
    [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, limit, offset]
  );
  
  const [count] = await pool.query(
    `SELECT COUNT(*) as total 
     FROM compra c
     JOIN producto p ON c.id_producto = p.id_producto
     JOIN proveedor pr ON c.id_proveedor = pr.id_proveedor
     JOIN empleado e ON c.dni = e.dni
     WHERE p.nombre LIKE ? OR pr.nombre LIKE ? 
     OR CONCAT(e.nombres, ' ', e.apellidos) LIKE ? OR c.observacion LIKE ?`,
    [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
  );
  
  return { 
    compras: rows, 
    total: count[0].total,
    page,
    totalPages: Math.ceil(count[0].total / limit)
  };
},

  // Get single purchase by ID
// Add this method if not exists
getCompraById: async (id, { connection } = {}) => {
  const conn = connection || pool;
  const [rows] = await conn.query(
    `SELECT c.*, p.nombre as producto_nombre, pr.nombre as proveedor_nombre 
     FROM compra c
     JOIN producto p ON c.id_producto = p.id_producto
     JOIN proveedor pr ON c.id_proveedor = pr.id_proveedor
     WHERE c.id_compra = ?`,
    [id]
  );
  return rows[0];
},

  // Create purchase
  createCompra: async (cantidad, preciounitario, id_producto, id_proveedor, dni, fecha, observacion) => {
    const [result] = await pool.query(
      `INSERT INTO compra (cantidad, preciounitario, id_producto, id_proveedor, dni, fecha, observacion) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cantidad, preciounitario, id_producto, id_proveedor, dni, fecha, observacion]
    );
    return result.insertId;
  },
  
  // Update purchase
  updateCompra: async (id, cantidad, preciounitario, id_producto, id_proveedor, dni, fecha, observacion) => {
    await pool.query(
      `UPDATE compra 
       SET cantidad = ?, preciounitario = ?, id_producto = ?, id_proveedor = ?, dni = ?, fecha = ?, observacion = ?
       WHERE id_compra = ?`,
      [cantidad, preciounitario, id_producto, id_proveedor, dni, fecha, observacion, id]
    );
  },

  // Delete purchase
  deleteCompra: async (id) => {
    await pool.query('DELETE FROM compra WHERE id_compra = ?', [id]);
  },

  // Bulk delete purchases
  // bulkDeleteCompras: async (ids) => {
  //   await pool.query('DELETE FROM compra WHERE id_compra IN (?)', [ids]);
  // },

// Get all purchases for Excel export
getAllCompras: async () => {
  const [rows] = await pool.query(
    `SELECT c.*, 
     p.nombre as producto_nombre, 
     p.variante as producto_variante,
     p.marca as producto_marca,
     p.descripcion as producto_descripcion,
     pr.nombre as proveedor_nombre, 
     CONCAT(e.nombres, ' ', e.apellidos) as empleado_nombre 
     FROM compra c
     JOIN producto p ON c.id_producto = p.id_producto
     JOIN proveedor pr ON c.id_proveedor = pr.id_proveedor
     JOIN empleado e ON c.dni = e.dni
     ORDER BY c.fecha DESC`
  );
  return rows;
},

// Get dropdown options
  getDropdownOptions: async () => {
    // Add variante, marca, and descripcion to the SELECT statement
    const [productos] = await pool.query('SELECT id_producto, nombre, variante, marca, descripcion FROM producto');
    const [proveedores] = await pool.query('SELECT id_proveedor, nombre FROM proveedor');
    const [empleados] = await pool.query('SELECT dni, CONCAT(nombres, " ", apellidos) as nombre FROM empleado');
    
    return {
      productos,
      proveedores,
      empleados
    };
  }
};