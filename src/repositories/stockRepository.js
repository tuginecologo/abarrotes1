const pool = require('../config/database');
const { retryOperation } = require('../utils/retry');

module.exports = {
  // Get current stock levels with product info
// In stockRepository.js - update the getStock method
// In stockRepository.js - update the getStock method
// In stockRepository.js - optimize the getStock method
getStock: async (page = 1, limit = 10, search = '') => {
  const offset = (page - 1) * limit;
  
  const operation = async () => {
    // Use a more optimized query with JOINs instead of subqueries
    const [rows] = await pool.query(
      `SELECT 
          p.id_producto, 
          p.nombre as producto_nombre, 
          p.descripcion, 
          p.variante,
          p.marca,
          COALESCE(rcp.total_recepcion, 0) - 
          COALESCE(vnt.total_ventas, 0) +
          COALESCE(dev.total_devoluciones, 0) -
          COALESCE(inc.total_incidencias, 0) as cantidad,
          pr.precio as precio_publico
       FROM producto p
       LEFT JOIN precio pr ON p.id_producto = pr.id_producto
       LEFT JOIN (
         SELECT id_producto, SUM(cantidad) as total_recepcion
         FROM recepcion
         GROUP BY id_producto
       ) rcp ON p.id_producto = rcp.id_producto
       LEFT JOIN (
         SELECT dv.id_producto, SUM(dv.cantidad) as total_ventas
         FROM detalle_venta dv
         JOIN venta v ON dv.id_venta = v.id_venta
         GROUP BY dv.id_producto
       ) vnt ON p.id_producto = vnt.id_producto
       LEFT JOIN (
         SELECT dvm.id_producto, SUM(dvm.cantidad) as total_devoluciones
         FROM detalle_venta_mod dvm
         JOIN venta_mod vm ON dvm.id_venta_mod = vm.id_venta_mod
         GROUP BY dvm.id_producto
       ) dev ON p.id_producto = dev.id_producto
       LEFT JOIN (
         SELECT id_producto, SUM(cantidad) as total_incidencias
         FROM detalle_incidencia
         GROUP BY id_producto
       ) inc ON p.id_producto = inc.id_producto
       WHERE p.nombre LIKE ? OR p.descripcion LIKE ? OR p.variante LIKE ? OR p.marca LIKE ?
       ORDER BY p.nombre
       LIMIT ? OFFSET ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, limit, offset]
    );
    
    const [count] = await pool.query(
        `SELECT COUNT(*) as total 
         FROM producto p
         WHERE p.nombre LIKE ? OR p.descripcion LIKE ? OR p.variante LIKE ? OR p.marca LIKE ?`,
        [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
    );
    
    return { rows, count };
  };
  
  try {
    const { rows, count } = await retryOperation(operation, 1000, 3);
    return { 
        stock: rows, 
        total: count[0].total,
        page,
        totalPages: Math.ceil(count[0].total / limit)
    };
  } catch (err) {
    console.error('Error in getStock after retries:', err);
    throw err;
  }
},
  // Update stock (add or remove quantity)
  updateStock: async (id_producto, cantidad, operation = 'add', { connection } = {}) => {
    const conn = connection || await pool.getConnection();
    let shouldRelease = !connection;
    
    try {
        if (!connection) await conn.beginTransaction();
        
        // First try to update existing record
        const updateResult = await conn.query(
            `UPDATE stock SET cantidad = cantidad ${operation === 'add' ? '+' : '-'} ? 
             WHERE id_producto = ?`,
            [cantidad, id_producto]
        );
        
        // Only insert if no existing record (for additions)
        if (updateResult[0].affectedRows === 0 && operation === 'add') {
            await conn.query(
                `INSERT INTO stock (id_producto, cantidad) VALUES (?, ?)`,
                [id_producto, cantidad]
            );
        }

        if (!connection) await conn.commit();
    } catch (err) {
        if (!connection) await conn.rollback();
        throw err;
    } finally {
        if (shouldRelease) conn.release();
    }
},

  // Get stock by product ID
// In stockRepository.js - update the getStockByProducto method
getStockByProducto: async (id_producto) => {
  const operation = async () => {
    const [rows] = await pool.query(
      `SELECT 
        COALESCE(
          (SELECT SUM(cantidad) FROM recepcion WHERE id_producto = ?), 
          0
        ) - 
        COALESCE(
          (SELECT SUM(dv.cantidad) 
           FROM detalle_venta dv
           JOIN venta v ON dv.id_venta = v.id_venta
           WHERE dv.id_producto = ?), 
          0
        ) +
        COALESCE(
          (SELECT SUM(dvm.cantidad)
           FROM detalle_venta_mod dvm
           JOIN venta_mod vm ON dvm.id_venta_mod = vm.id_venta_mod
           WHERE dvm.id_producto = ?),
          0
        ) -
        COALESCE(
          (SELECT SUM(di.cantidad)
           FROM detalle_incidencia di
           WHERE di.id_producto = ?),
          0
        ) as cantidad`,
      [id_producto, id_producto, id_producto, id_producto]
    );
    return rows[0];
  };
  
  try {
    return await retryOperation(operation, 1000, 3);
  } catch (err) {
    console.error('Error in getStockByProducto after retries:', err);
    throw err;
  }
},

  // Get all stock for Excel export
  getAllStock: async () => {
    const [rows] = await pool.query(
      `SELECT 
            p.id_producto, 
            p.nombre as producto_nombre, 
            p.descripcion, 
            p.variante,
            p.marca,  -- Add marca field
            COALESCE(
              (SELECT SUM(cantidad) FROM recepcion WHERE id_producto = p.id_producto), 
              0
            ) - 
            COALESCE(
              (SELECT SUM(dv.cantidad) 
               FROM detalle_venta dv
               JOIN venta v ON dv.id_venta = v.id_venta
               WHERE dv.id_producto = p.id_producto), 
              0
            ) +
            COALESCE(
              (SELECT SUM(dvm.cantidad)
               FROM detalle_venta_mod dvm
               JOIN venta_mod vm ON dvm.id_venta_mod = vm.id_venta_mod
               WHERE dvm.id_producto = p.id_producto),
              0
            ) as cantidad,
            pr.precio as precio_publico
       FROM producto p
       LEFT JOIN precio pr ON p.id_producto = pr.id_producto
       ORDER BY p.nombre`
    );
    return rows;
  }
};