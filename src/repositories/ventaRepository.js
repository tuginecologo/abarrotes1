const pool = require('../config/database');
const { getMetodoPago } = require('../utils/paymentMethods');

module.exports = {
  getConnection: () => {
    return pool.getConnection();
  },

  getVentas: async (page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT 
         v.*, 
         CONCAT(e.nombres, ' ', e.apellidos) as vendedor,
         CONCAT(c.nombres, ' ', c.apellidos) as cliente,
         m.total as original_total,
         IFNULL((
           SELECT SUM(mvm.total) 
           FROM venta_mod vm
           JOIN monto_venta_mod mvm ON vm.id_venta_mod = mvm.id_venta_mod
           WHERE vm.id_venta = v.id_venta
         ), 0) as returns_amount,
         (m.total + IFNULL((
           SELECT SUM(mvm.total) 
           FROM venta_mod vm
           JOIN monto_venta_mod mvm ON vm.id_venta_mod = mvm.id_venta_mod
           WHERE vm.id_venta = v.id_venta
         ), 0)) as net_total,
         (SELECT SUM(cantidad) FROM detalle_venta WHERE id_venta = v.id_venta) as items_count
       FROM venta v
       JOIN empleado e ON v.dnivend = e.dni
       JOIN cliente c ON v.dnicomp = c.dni
       JOIN monto_venta m ON v.id_venta = m.id_venta
       ORDER BY v.id_venta DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    const [count] = await pool.query('SELECT COUNT(*) as total FROM venta');
    return { 
      ventas: rows, 
      total: count[0].total,
      page,
      totalPages: Math.ceil(count[0].total / limit)
    };
  },

  getClientes: async () => {
    const [clientes] = await pool.query('SELECT dni, CONCAT(nombres, " ", apellidos) as nombre FROM cliente ORDER BY nombre');
    return clientes;
  },

  getEmpleados: async () => {
    const [empleados] = await pool.query('SELECT dni, CONCAT(nombres, " ", apellidos) as nombre FROM empleado ORDER BY nombre');
    return empleados;
  },

  getProductosEnStock: async () => {
    try {
      const [productos] = await pool.query(
        `SELECT 
           p.id_producto, 
           p.nombre, 
           p.variante, 
           p.marca,
           COALESCE(pr.precio, 0) as precio,
           COALESCE(
             (SELECT SUM(cantidad) FROM stock WHERE id_producto = p.id_producto), 
             0
           ) as cantidad
         FROM producto p
         LEFT JOIN precio pr ON p.id_producto = pr.id_producto
         WHERE EXISTS (
           SELECT 1 FROM stock WHERE id_producto = p.id_producto AND cantidad > 0
         )
         ORDER BY p.nombre`
      );
      return productos;
    } catch (error) {
      console.error('Error fetching products in stock:', error);
      throw error;
    }
  },

  getProductPrice: async (id_producto) => {
    const [rows] = await pool.query('SELECT precio FROM precio WHERE id_producto = ?', [id_producto]);
    return rows[0]?.precio || 0;
  },

  createVenta: async (dnivend, dnicomp, fecha, mediodepago, noperacion, payment_details = null) => {
    const [result] = await pool.query(
      `INSERT INTO venta (dnivend, dnicomp, fecha, mediodepago, noperacion, payment_details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dnivend, dnicomp, fecha, mediodepago, noperacion, payment_details]
    );
    return result.insertId;
  },

  createDetalleVenta: async (cantidad, id_producto, observacion, id_venta, id_precio, precio) => {
    const [result] = await pool.query(
      `INSERT INTO detalle_venta 
       (cantidad, id_producto, observacion, id_venta, id_precio, precio)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cantidad, id_producto, observacion, id_venta, id_precio, precio]
    );
    return result.insertId;
  },

  createMontoVenta: async (total, id_venta) => {
    await pool.query(
      `INSERT INTO monto_venta (total, id_venta) VALUES (?, ?)`,
      [total, id_venta]
    );
  },

  getVentaDetails: async (id) => {
    if (!id || isNaN(id)) {
      throw new Error('ID de venta inválido');
    }

    let connection;
    try {
      connection = await pool.getConnection();
      
      const [venta] = await connection.query(
        `SELECT 
           v.*, 
           CONCAT(e.nombres, ' ', e.apellidos) as vendedor,
           CONCAT(c.nombres, ' ', c.apellidos) as cliente,
           m.total,
           (m.total + IFNULL((
             SELECT SUM(mvm.total)
             FROM venta_mod vm
             JOIN monto_venta_mod mvm ON vm.id_venta_mod = mvm.id_venta_mod
             WHERE vm.id_venta = v.id_venta
           ), 0)) as net_total,
           v.mediodepago,
           v.noperacion,
           v.payment_details
         FROM venta v
         JOIN empleado e ON v.dnivend = e.dni
         JOIN cliente c ON v.dnicomp = c.dni
         JOIN monto_venta m ON v.id_venta = m.id_venta
         WHERE v.id_venta = ?`,
        [id]
      );

      if (!venta || venta.length === 0) {
        throw new Error(`Venta con ID ${id} no encontrada`);
      }

      const ventaData = venta[0];

      // Get sale details with id_detalle
      const [detalles] = await connection.query(
        `SELECT 
           dv.id_detalle,
           dv.cantidad, 
           dv.id_producto,
           p.nombre as producto_nombre,
           p.marca,
           p.variante,
           p.descripcion,
           dv.precio
         FROM detalle_venta dv
         JOIN producto p ON dv.id_producto = p.id_producto
         WHERE dv.id_venta = ?`,
        [id]
      );

      // Get already returned quantities
      const [returnedQuantities] = await connection.query(
        `SELECT id_producto, SUM(cantidad) as total_returned
         FROM detalle_venta_mod dvm
         JOIN venta_mod vm ON dvm.id_venta_mod = vm.id_venta_mod
         WHERE vm.id_venta = ?
         GROUP BY id_producto`,
        [id]
      );
      
      const returnedQuantitiesMap = {};
      returnedQuantities.forEach(item => {
        returnedQuantitiesMap[item.id_producto] = item.total_returned;
      });
      
      detalles.forEach(detalle => {
        const alreadyReturned = returnedQuantitiesMap[detalle.id_producto] || 0;
        detalle.alreadyReturned = alreadyReturned;
        detalle.maxReturnable = detalle.cantidad - alreadyReturned;
      });

      return {
        ...ventaData,
        detalles,
        metodoPago: ventaData.mediodepago ? getMetodoPago(ventaData.mediodepago) : 'No especificado'
      };
    } catch (error) {
      console.error('Error en getVentaDetails:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  createVentaMod: async (ventaModData) => {
    const [result] = await pool.query(
      `INSERT INTO venta_mod 
       (id_venta, dnivend, fecha, mediodepago, noperacion, payment_details, motivo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        ventaModData.id_venta,
        ventaModData.dnivend,
        ventaModData.fecha,
        ventaModData.mediodepago,
        ventaModData.noperacion,
        ventaModData.payment_details,
        ventaModData.motivo
      ]
    );
    return result.insertId;
  },

  createDetalleVentaMod: async (detalleData) => {
    await pool.query(
      `INSERT INTO detalle_venta_mod 
       (cantidad, id_producto, motivo, id_venta_mod, precio)
       VALUES (?, ?, ?, ?, ?)`,
      [
        detalleData.cantidad,
        detalleData.id_producto,
        detalleData.motivo,
        detalleData.id_venta_mod,
        detalleData.precio
      ]
    );
  },

  createMontoVentaMod: async (montoData) => {
    await pool.query(
      `INSERT INTO monto_venta_mod (total, id_venta_mod) VALUES (?, ?)`,
      [montoData.total, montoData.id_venta_mod]
    );
  },

  getVentaHistory: async (ventaId) => {
    const [modifications] = await pool.query(
      `SELECT 
         vm.*,
         CONCAT(e.nombres, ' ', e.apellidos) as empleado,
         mvm.total,
         (SELECT COUNT(*) FROM detalle_venta_mod WHERE id_venta_mod = vm.id_venta_mod) as items_count
       FROM venta_mod vm
       JOIN empleado e ON vm.dnivend = e.dni
       JOIN monto_venta_mod mvm ON vm.id_venta_mod = mvm.id_venta_mod
       WHERE vm.id_venta = ?
       ORDER BY vm.fecha DESC`,
      [ventaId]
    );

    for (const mod of modifications) {
      const [details] = await pool.query(
        `SELECT 
           dvm.*,
           p.id_producto,
           p.nombre as producto_nombre,
           p.marca,
           p.variante,
           p.descripcion,
           dvm.precio
         FROM detalle_venta_mod dvm
         JOIN producto p ON dvm.id_producto = p.id_producto
         WHERE dvm.id_venta_mod = ?`,
        [mod.id_venta_mod]
      );
      mod.detalles = details;
    }

    return modifications;
  },

  getAllVentas: async () => {
    try {
      const [ventas] = await pool.query(
        `SELECT 
           v.*, 
           CONCAT(e.nombres, ' ', e.apellidos) as vendedor,
           CONCAT(c.nombres, ' ', c.apellidos) as cliente,
           m.total as original_total,
           IFNULL((
             SELECT SUM(mvm.total) 
             FROM venta_mod vm
             JOIN monto_venta_mod mvm ON vm.id_venta_mod = mvm.id_venta_mod
             WHERE vm.id_venta = v.id_venta
           ), 0) as returns_amount,
           (m.total + IFNULL((
             SELECT SUM(mvm.total) 
             FROM venta_mod vm
             JOIN monto_venta_mod mvm ON vm.id_venta_mod = mvm.id_venta_mod
             WHERE vm.id_venta = v.id_venta
           ), 0)) as net_total,
           (SELECT SUM(cantidad) FROM detalle_venta WHERE id_venta = v.id_venta) as items_count,
           v.mediodepago
         FROM venta v
         JOIN empleado e ON v.dnivend = e.dni
         JOIN cliente c ON v.dnicomp = c.dni
         JOIN monto_venta m ON v.id_venta = m.id_venta
         ORDER BY v.id_venta DESC`
      );
      return ventas;
    } catch (error) {
      console.error('Error in getAllVentas:', error);
      throw error;
    }
  },

  getReturnedQuantitiesByVenta: async (ventaId) => {
    const [rows] = await pool.query(
      `SELECT id_producto, SUM(cantidad) as total_returned
       FROM detalle_venta_mod dvm
       JOIN venta_mod vm ON dvm.id_venta_mod = vm.id_venta_mod
       WHERE vm.id_venta = ?
       GROUP BY id_producto`,
      [ventaId]
    );
    
    const returnedQuantities = {};
    rows.forEach(row => {
      returnedQuantities[row.id_producto] = row.total_returned;
    });
    return returnedQuantities;
  }
};