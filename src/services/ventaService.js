const pool = require('../config/database');
const ventaRepository = require('../repositories/ventaRepository');
const stockService = require('../services/stockService');
const {getMetodoPago}=require('../utils/paymentMethods');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');

module.exports = {
  // Get sales with pagination
  getVentas: async (page, limit) => {
    return await ventaRepository.getVentas(page, limit);
  },

// In ventaService.js - CORRECTED version
getDropdownOptions: async () => {
  try {
    const [clientes, empleados, productos] = await Promise.all([
      ventaRepository.getClientes(),
      ventaRepository.getEmpleados(),
      // Use the same stock calculation as the stock view BUT include marca
      pool.query(`
        SELECT 
          p.id_producto, 
          p.nombre, 
          p.variante, 
          p.marca,  -- Just the column name, no JavaScript comments
          COALESCE(pr.precio, 0) as precio,
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
          ) as cantidad
        FROM producto p
        LEFT JOIN precio pr ON p.id_producto = pr.id_producto
        WHERE EXISTS (
          SELECT 1 FROM stock WHERE id_producto = p.id_producto
        )
        ORDER BY p.nombre
      `)
    ]);

    // Filter out products with zero or negative stock
    const filteredProducts = productos[0].filter(p => p.cantidad > 0);

    return {
      clientes,
      empleados,
      productos: filteredProducts.map(p => ({
        ...p,
        precio: Number(p.precio) || 0,
        marca: p.marca || ''  // Ensure marca is included
      }))
    };
  } catch (error) {
    console.error('Error getting dropdown options:', error);
    throw error;
  }
},
// Create new sale
createVenta: async (ventaData) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Use ventaData.noperacion and ventaData.payment_details instead of undefined variables
    let noperacionToStore = ventaData.noperacion;
    let paymentDetailsToStore = ventaData.payment_details;
    
    // For mixed payments, ensure proper data structure
    if (ventaData.mediodepago === '5' && ventaData.payment_details) {
      try {
        const mixedData = typeof ventaData.payment_details === 'string' ? 
          JSON.parse(ventaData.payment_details) : ventaData.payment_details;
        
        // Extract operation number for noperacion field
        noperacionToStore = mixedData.operacion_electronica || '';
        paymentDetailsToStore = JSON.stringify(mixedData);
      } catch (e) {
        throw new Error('Formato inválido para pago mixto');
      }
    } else if (ventaData.mediodepago !== '5') {
      // For non-mixed payments, ensure payment_details is null
      paymentDetailsToStore = null;
    }

    // 1. Create venta record 
    const [ventaResult] = await connection.query(
      `INSERT INTO venta (dnivend, dnicomp, fecha, mediodepago, noperacion, payment_details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ventaData.dnivend, ventaData.dnicomp, ventaData.fecha, 
       ventaData.mediodepago, noperacionToStore, paymentDetailsToStore]
    );
    
    const id_venta = ventaResult.insertId;
    let totalVenta = 0;

    // 2. Process each product in the sale
    for (const producto of ventaData.productos) {
      // Get current price ID and value
      const [priceRow] = await connection.query(
        'SELECT id_precio, precio FROM precio WHERE id_producto = ? ORDER BY id_precio DESC LIMIT 1',
        [producto.id_producto]
      );

      if (!priceRow || priceRow.length === 0) {
        throw new Error(`No price found for product ${producto.id_producto}`);
      }

      const id_precio = priceRow[0].id_precio;
      const precio = priceRow[0].precio;
      const subtotal = precio * producto.cantidad;
      totalVenta += subtotal;

      // Create detalle_venta with price reference AND price value
      await connection.query(
        `INSERT INTO detalle_venta 
         (id_venta, id_producto, cantidad, id_precio, precio)
         VALUES (?, ?, ?, ?, ?)`,
        [id_venta, producto.id_producto, producto.cantidad, id_precio, precio]
      );

      // Update stock (reduce quantity)
      await stockService.updateStock(
        producto.id_producto,
        producto.cantidad,
        'remove',
        { connection }
      );
    }

    // 3. Create monto_venta record
    await connection.query(
      `INSERT INTO monto_venta (total, id_venta)
       VALUES (?, ?)`,
      [totalVenta, id_venta]
    );

    await connection.commit();
    return id_venta;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
},
  // Get sale details
// In ventaService.js - update getVentaDetails
getVentaDetails: async (id) => {
  try {
    const venta = await ventaRepository.getVentaDetails(id);
    
    // Additional validation if needed
    if (!venta) {
      throw new Error('No se pudo obtener los detalles de la venta');
    }
    
    return venta;
  } catch (error) {
    console.error('Error en servicio getVentaDetails:', error);
    throw error;
  }
},
  // Process return
  processReturn: async (returnData) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
  
      let noperacionToStore = returnData.noperacion || 'DEVOLUCION';
      let paymentDetailsToStore = null;
      
      // For mixed payment returns
      if (returnData.mediodepago === '5') {
        try {
          // Check if we have payment_details in the request
          if (returnData.payment_details) {
            const mixedData = typeof returnData.payment_details === 'string' ? 
              JSON.parse(returnData.payment_details) : returnData.payment_details;
            
            paymentDetailsToStore = JSON.stringify(mixedData);
            noperacionToStore = mixedData.operacion_electronica || 'DEVOLUCION';
          } 
          // Handle case where data might be in noperacion (backward compatibility)
          else if (returnData.noperacion && returnData.noperacion !== 'DEVOLUCION') {
            try {
              const mixedData = JSON.parse(returnData.noperacion);
              paymentDetailsToStore = returnData.noperacion;
              noperacionToStore = mixedData.operacion_electronica || 'DEVOLUCION';
            } catch (e) {
              // If it's not JSON, use as is
              paymentDetailsToStore = null;
            }
          }
        } catch (e) {
          console.error('Error processing mixed payment return:', e);
          // If it's not valid JSON, leave as is
        }
      }

    // 1. Create venta_mod record
    const [ventaModResult] = await connection.query(
      `INSERT INTO venta_mod 
       (id_venta, dnivend, fecha, mediodepago, noperacion, payment_details, motivo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [returnData.originalVentaId, returnData.dnivend, new Date(), 
       returnData.mediodepago, noperacionToStore, paymentDetailsToStore, returnData.motivo || 'Devolución']
    );
    const ventaModId = ventaModResult.insertId;

    let total = 0;
    
    // 2. Process each returned product
    for (const producto of returnData.productos) {
      // Get the original price from detalle_venta
      const [originalDetail] = await connection.query(
        `SELECT precio FROM detalle_venta 
         WHERE id_venta = ? AND id_producto = ? LIMIT 1`,
        [returnData.originalVentaId, producto.id_producto]
      );

      if (!originalDetail || originalDetail.length === 0) {
        throw new Error(`Producto no encontrado en la venta original: ${producto.id_producto}`);
      }

      const precio = originalDetail[0].precio;
      const subtotal = precio * producto.cantidad;
      total -= subtotal; // Negative amount for returns

          // Create detalle_venta_mod without motivo
      await connection.query(
        `INSERT INTO detalle_venta_mod 
         (cantidad, id_producto, id_venta_mod, precio)
         VALUES (?, ?, ?, ?)`,
        [producto.cantidad, producto.id_producto, ventaModId, precio]
      );

      // Return stock to inventory
      await stockService.updateStock(
        producto.id_producto,
        producto.cantidad,
        'add',
        { connection }
      );
    }

    // 3. Create monto_venta_mod record
    await connection.query(
      `INSERT INTO monto_venta_mod (total, id_venta_mod)
       VALUES (?, ?)`,
      [total, ventaModId]
    );

    await connection.commit();
    return ventaModId;
  } catch (err) {
    await connection.rollback();
    console.error('Error processing return:', err);
    throw err;
  } finally {
    connection.release();
  }
},

// Get sale modification history
getVentaHistory: async (ventaId) => {
  return await ventaRepository.getVentaHistory(ventaId);
},

getProductPrice: async (id_producto) => {
  return await pool.query(
    'SELECT id_precio FROM precio WHERE id_producto = ? ORDER BY id_precio DESC LIMIT 1',
    [id_producto]
  );
},
// Add this method to ventaService.js
getAlreadyReturnedQuantities: async (ventaId) => {
  const [returnedItems] = await pool.query(
    `SELECT id_producto, SUM(cantidad) as total_returned
     FROM detalle_venta_mod dvm
     JOIN venta_mod vm ON dvm.id_venta_mod = vm.id_venta_mod
     WHERE vm.id_venta = ?
     GROUP BY id_producto`,
    [ventaId]
  );
  
  const returnedQuantities = {};
  returnedItems.forEach(item => {
    returnedQuantities[item.id_producto] = item.total_returned;
  });
  
  return returnedQuantities;
},
exportToExcel: async () => {
  try {
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Ventas');

    // Get all sales data
    const ventas = await ventaRepository.getAllVentas();

    if (!ventas || ventas.length === 0) {
      throw new Error('No hay ventas para exportar');
    }

    // Define columns
    worksheet.columns = [
      { header: 'ID Venta', key: 'id_venta', width: 10 },
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Vendedor', key: 'vendedor', width: 30 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Total Original (S/)', key: 'original_total', width: 15 },
      { header: 'Total Devoluciones (S/)', key: 'returns_amount', width: 15 },
      { header: 'Total Neto (S/)', key: 'net_total', width: 15 },
      { header: 'Método Pago', key: 'mediodepago', width: 15 }
    ];

    // Add data to worksheet
    ventas.forEach(venta => {
      worksheet.addRow({
        id_venta: venta.id_venta,
        fecha: venta.fecha ? new Date(venta.fecha).toLocaleDateString() : 'N/A',
        vendedor: venta.vendedor || 'N/A',
        cliente: venta.cliente || 'N/A',
        original_total: parseFloat(venta.original_total) || 0,
        returns_amount: parseFloat(venta.returns_amount) || 0,
        net_total: parseFloat(venta.net_total) || 0,
        mediodepago: venta.mediodepago ? getMetodoPago(venta.mediodepago) : 'No especificado'
      });
    });

    // Format numeric columns
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Skip header row
        ['original_total', 'returns_amount', 'net_total'].forEach(key => {
          const cell = row.getCell(key);
          if (cell.value) {
            cell.numFmt = '"S/"#,##0.00';
          }
        });
      }
    });

    // Style the header row
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    });

    // Ensure export directory exists
    const exportDir = path.join(__dirname, '../public/exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const exportPath = path.join(exportDir, 'ventas.xlsx');
    await workbook.xlsx.writeFile(exportPath);

    return exportPath;
  } catch (error) {
    console.error('Error in exportToExcel:', error);
    throw error;
  }
},
// Add this method to ventaService.js
exportHistoryToExcel: async (venta, history) => {
  try {
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Historial de Modificaciones');

    // Add sale information
    worksheet.addRow(['Historial de Modificaciones - Venta #' + venta.id_venta]);
    worksheet.addRow([]);
    worksheet.addRow(['Fecha original:', venta.fecha.toLocaleDateString()]);
    worksheet.addRow(['Vendedor original:', venta.vendedor]);
    worksheet.addRow(['Cliente:', venta.cliente]);
    worksheet.addRow(['Total original:', 'S/ ' + venta.total.toFixed(2)]);
    worksheet.addRow(['Total neto:', 'S/ ' + venta.net_total.toFixed(2)]);
    worksheet.addRow([]);
    worksheet.addRow([]);

    if (!history || history.length === 0) {
      worksheet.addRow(['No hay modificaciones registradas para esta venta.']);
    } else {
      // Add modifications header
      worksheet.addRow(['Modificaciones:']);
      worksheet.addRow([]);

      // Add each modification
      history.forEach((mod, index) => {
        worksheet.addRow([
          'Modificación #' + (index + 1),
          mod.fecha.toLocaleString(),
          mod.empleado,
          mod.total < 0 ? 'Devolución: S/ ' + (-mod.total).toFixed(2) : 'Modificación: S/ ' + mod.total.toFixed(2),
          getMetodoPago(mod.mediodepago),
          mod.motivo || ''
        ]);

        // Add modification details header
        worksheet.addRow([
          'ID',
          'Producto',
          'Marca',
          'Variante',
          'Descripción',
          'Precio Unitario',
          'Cantidad',
          'Subtotal',
          mod.total < 0 ? 'Motivo' : ''
        ]);

        // Add modification details
        mod.detalles.forEach(detalle => {
          worksheet.addRow([
            detalle.id_producto,
            detalle.producto_nombre,
            detalle.marca || 'N/A',
            detalle.variante || 'N/A',
            detalle.descripcion || 'N/A',
            'S/ ' + detalle.precio.toFixed(2),
            detalle.cantidad,
            'S/ ' + (detalle.precio * detalle.cantidad).toFixed(2),
            mod.total < 0 ? mod.motivo : ''
          ]);
        });

        worksheet.addRow([]);
      });
    }

    // Style the header rows
    worksheet.getRow(1).font = { bold: true, size: 16 };
    
    // Set column widths
    worksheet.columns = [
      { width: 15 },
      { width: 20 },
      { width: 20 },
      { width: 25 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 30 }
    ];

    // Ensure export directory exists
    const exportDir = path.join(__dirname, '../public/exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const exportPath = path.join(exportDir, `historial_venta_${venta.id_venta}.xlsx`);
    await workbook.xlsx.writeFile(exportPath);

    return exportPath;
  } catch (error) {
    console.error('Error in exportHistoryToExcel:', error);
    throw error;
  }
}
};