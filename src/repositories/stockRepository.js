const pool = require('../config/database');

module.exports = {
  // Get current stock levels with product info
  getStock: async (page = 1, limit = 10, search = '') => {
    const offset = (page - 1) * limit;
    
    const [rows] = await pool.query(
      `SELECT 
            p.id_producto, 
            p.nombre as producto_nombre, 
            p.descripcion, 
            p.variante,
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
       WHERE p.nombre LIKE ? OR p.descripcion LIKE ? OR p.variante LIKE ?
       ORDER BY p.nombre
       LIMIT ? OFFSET ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`, limit, offset]
    );
    
    const [count] = await pool.query(
        `SELECT COUNT(*) as total 
         FROM producto p
         WHERE p.nombre LIKE ? OR p.descripcion LIKE ? OR p.variante LIKE ?`,
        [`%${search}%`, `%${search}%`, `%${search}%`]
    );
    
    return { 
        stock: rows, 
        total: count[0].total,
        page,
        totalPages: Math.ceil(count[0].total / limit)
    };
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
  getStockByProducto: async (id_producto) => {
    const [rows] = await pool.query(
      'SELECT COALESCE(SUM(cantidad), 0) as cantidad FROM stock WHERE id_producto = ?',
      [id_producto]
    );
    return rows[0];
  },


  // Get all stock for Excel export
  getAllStock: async () => {
    const [rows] = await pool.query(
      `SELECT 
            p.id_producto, 
            p.nombre as producto_nombre, 
            p.descripcion, 
            p.variante,
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