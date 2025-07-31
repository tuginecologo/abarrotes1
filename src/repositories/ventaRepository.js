
const pool = require('../config/database');

module.exports = {
  // Get connection for transaction
  getConnection: () => {
    return pool.getConnection();
  },

  // Get sales with pagination
// Get sales with pagination
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
  // Get clients
  getClientes: async () => {
    const [clientes] = await pool.query('SELECT dni, CONCAT(nombres, " ", apellidos) as nombre FROM cliente ORDER BY nombre');
    return clientes; // Return just the array, not the array wrapped in another array
  },

  // Get employees
  getEmpleados: async () => {
    const [empleados] = await pool.query('SELECT dni, CONCAT(nombres, " ", apellidos) as nombre FROM empleado ORDER BY nombre');
    return empleados;
  },

  // Get products in stock
// In ventaRepository.js
getProductosEnStock: async () => {
  try {
    const [productos] = await pool.query(
      `SELECT 
         p.id_producto, 
         p.nombre, 
         p.variante, 
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
  // Get product price
  getProductPrice: async (id_producto) => {
    const [rows] = await pool.query('SELECT precio FROM precio WHERE id_producto = ?', [id_producto]);
    return rows[0]?.precio || 0;
  },

  // Create sale
  createVenta: async (dnivend, dnicomp, fecha, mediodepago, noperacion) => {
    console.log("Creating venta record:", { dnivend, dnicomp, fecha, mediodepago, noperacion });
    const [result] = await pool.query(
      `INSERT INTO venta (dnivend, dnicomp, fecha, mediodepago, noperacion)
       VALUES (?, ?, ?, ?, ?)`,
      [dnivend, dnicomp, fecha, mediodepago, noperacion]
    );
    console.log("Venta created with ID:", result.insertId);
    return result.insertId;
  },
  
  createDetalleVenta: async (cantidad, id_producto, observacion, id_venta) => {
    console.log("Creating detalle_venta:", { cantidad, id_producto, observacion, id_venta });
    await pool.query(
      `INSERT INTO detalle_venta (cantidad, id_producto, observacion, id_venta)
       VALUES (?, ?, ?, ?)`,
      [cantidad, id_producto, observacion, id_venta]
    );
    console.log("Detalle_venta created successfully");
  },

  // Create sale amount
  createMontoVenta: async (total, id_venta) => {
    await pool.query(
      `INSERT INTO monto_venta (total, id_venta)
       VALUES (?, ?)`,
      [total, id_venta]
    );
  },

// In ventaRepository.js - update getVentaDetails
// In ventaRepository.js - update getVentaDetails
// In ventaRepository.js - update getVentaDetails
getVentaDetails: async (id) => {
  // First validate the ID
  if (!id || isNaN(id)) {
    throw new Error('ID de venta inválido');
  }

  try {
    const [venta] = await pool.query(
      `SELECT v.*, 
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
       v.noperacion
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

    const [detalles] = await pool.query(
      `SELECT 
         dv.*, 
         p.nombre as producto_nombre,
         dv.precio as precio
       FROM detalle_venta dv
       JOIN producto p ON dv.id_producto = p.id_producto
       WHERE dv.id_venta = ?`,
      [id]
    );

    return {
      ...ventaData,
      detalles,
      metodoPago: ventaData.mediodepago ? getMetodoPago(ventaData.mediodepago) : 'No especificado'
    };
  } catch (error) {
    console.error('Error en getVentaDetails:', error);
    throw error;
  }
},
  // Create venta_mod record
createVentaMod: async (ventaModData) => {
  const [result] = await pool.query(
    `INSERT INTO venta_mod 
     (id_venta, dnivend, fecha, mediodepago, noperacion)
     VALUES (?, ?, ?, ?, ?)`,
    [
      ventaModData.id_venta,
      ventaModData.dnivend,
      ventaModData.fecha,
      ventaModData.mediodepago,
      ventaModData.noperacion
    ]
  );
  return result.insertId;
},

// Create detalle_venta_mod record
createDetalleVentaMod: async (detalleData) => {
  await pool.query(
    `INSERT INTO detalle_venta_mod 
     (cantidad, id_producto, motivo, id_venta_mod)
     VALUES (?, ?, ?, ?)`,
    [
      detalleData.cantidad,
      detalleData.id_producto,
      detalleData.motivo,
      detalleData.id_venta_mod
    ]
  );
},

// Create monto_venta_mod record
createMontoVentaMod: async (montoData) => {
  await pool.query(
    `INSERT INTO monto_venta_mod 
     (total, id_venta_mod)
     VALUES (?, ?)`,
    [montoData.total, montoData.id_venta_mod]
  );
},

// Get sale modification history
// In ventaRepository.js - getVentaHistory
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

  // Get details for each modification
  for (const mod of modifications) {
    const [details] = await pool.query(
      `SELECT 
         dvm.*,
         p.nombre as producto_nombre,
         dvm.precio as precio
       FROM detalle_venta_mod dvm
       JOIN producto p ON dvm.id_producto = p.id_producto
       WHERE dvm.id_venta_mod = ?`,
      [mod.id_venta_mod]
    );
    mod.detalles = details;
  }

  return modifications;
},
// Add this to ventaRepository.js exports
getAllVentas: async () => {
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
       (SELECT SUM(cantidad) FROM detalle_venta WHERE id_venta = v.id_venta) as items_count
     FROM venta v
     JOIN empleado e ON v.dnivend = e.dni
     JOIN cliente c ON v.dnicomp = c.dni
     JOIN monto_venta m ON v.id_venta = m.id_venta
     ORDER BY v.id_venta DESC`
  );
  return ventas;
},
}

function getMetodoPago(codigo) {
  switch(codigo) {
    case '1': return 'Efectivo';
    case '2': return 'Yape';
    case '3': return 'Plin/Transferencia';
    default: return 'Desconocido';
  }
}
