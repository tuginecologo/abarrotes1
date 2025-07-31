

const pool = require('../config/database');  // Add this line at the top
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');
const compraRepository = require('../repositories/compraRepository');
const recepcionRepository = require('../repositories/recepcionRepository');
const stockService = require('../services/stockService');

module.exports = {
  // Get recepciones with pagination and search
  getRecepciones: async (page, limit, search) => {
    return await recepcionRepository.getRecepciones(page, limit, search);
  },

  // Get single recepcion by ID
  getRecepcionById: async (id) => {
    const recepcion = await recepcionRepository.getRecepcionById(id);
    if (!recepcion) {
      throw new Error('Recepción no encontrada');
    }
    return recepcion;
  },

  // Create new recepcion
  createRecepcion: async (recepcionData) => {
    const connection = await pool.getConnection();
    try {
      console.log('Starting transaction for recepcion creation');
      await connection.beginTransaction();
  
      // 1. Get compra details
      console.log('Getting compra with ID:', recepcionData.id_compra);
      const compra = await compraRepository.getCompraById(recepcionData.id_compra, { connection });
      if (!compra) throw new Error('Compra no encontrada');
      
      console.log('Compra found:', compra);
      
      // 2. Validate quantity
      console.log('Validating quantity:', recepcionData.cantidad, 'against compra quantity:', compra.cantidad);
      if (recepcionData.cantidad > compra.cantidad) {
        throw new Error('La cantidad recibida excede la cantidad comprada');
      }
  
      // 3. Create recepcion record
      console.log('Creating recepcion record');
      await recepcionRepository.createRecepcion(
        recepcionData.cantidad,
        compra.id_producto,
        compra.id_proveedor,
        recepcionData.dni,
        recepcionData.fecha,
        recepcionData.observacion,
        recepcionData.id_compra,
        { connection }
      );
  
      // 4. Update stock
      console.log('Updating stock for product:', compra.id_producto, 'with quantity:', recepcionData.cantidad);
      await stockService.updateStock(
        compra.id_producto,
        recepcionData.cantidad,
        'add',
        { connection }
      );
  
      await connection.commit();
      console.log('Transaction committed successfully');
    } catch (err) {
      console.error('Error in createRecepcion:', err);
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },
  // Update recepcion
// In recepcionService.updateRecepcion
updateRecepcion: async (id, recepcionData) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const originalRecepcion = await recepcionRepository.getRecepcionById(id, { connection });
    if (!originalRecepcion) {
      throw new Error('Recepción no encontrada');
    }
    
    const quantityDifference = recepcionData.cantidad - originalRecepcion.cantidad;
    
    // Update reception
    await recepcionRepository.updateRecepcion(
      id,
      recepcionData.cantidad,
      recepcionData.id_producto,
      recepcionData.id_proveedor,
      recepcionData.dni,
      recepcionData.fecha,
      recepcionData.observacion,
      { connection }
    );
    
    // Update stock if quantity changed
    if (quantityDifference !== 0) {
      const operation = quantityDifference > 0 ? 'add' : 'remove';
      await stockService.updateStock(
        recepcionData.id_producto, 
        Math.abs(quantityDifference), 
        operation,
        { connection }
      );
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
},

  // Delete recepcion
  deleteRecepcion: async (id) => {
    const recepcion = await recepcionRepository.getRecepcionById(id);
    if (!recepcion) {
      throw new Error('Recepción no encontrada');
    }
    
    // Remove from stock first
    await stockService.updateStock(
      recepcion.id_producto, 
      recepcion.cantidad, 
      'remove'
    );
    
    // Then delete the reception
    await recepcionRepository.deleteRecepcion(id);
  },

  // Bulk delete recepciones
  // bulkDeleteRecepciones: async (ids) => {
  //   if (!ids || ids.length === 0) {
  //     throw new Error('No se proporcionaron IDs de recepciones');
  //   }
  //   return await recepcionRepository.bulkDeleteRecepciones(ids);
  // },

  // Export to Excel
  exportToExcel: async () => {
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Recepciones');

    const recepciones = await recepcionRepository.getAllRecepciones();

    worksheet.columns = [
      { header: 'ID', key: 'id_recepcion', width: 10 },
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Producto', key: 'producto_nombre', width: 30 },
      { header: 'Cantidad', key: 'cantidad', width: 15 },
      { header: 'Proveedor', key: 'proveedor_nombre', width: 30 },
      { header: 'Empleado', key: 'empleado_nombre', width: 30 },
      { header: 'Observación', key: 'observacion', width: 40 }
    ];

    recepciones.forEach(recepcion => {
      worksheet.addRow(recepcion);
    });

    // Format date
    worksheet.eachRow((row) => {
      const fechaCell = row.getCell('fecha');
      if (fechaCell.value) {
        fechaCell.numFmt = 'dd/mm/yyyy';
      }
    });

    const exportDir = path.join(__dirname, '../public/exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const exportPath = path.join(exportDir, 'recepciones.xlsx');
    await workbook.xlsx.writeFile(exportPath);

    return exportPath;
  },

  // Get dropdown options
  getDropdownOptions: async () => {
    return await recepcionRepository.getDropdownOptions();
  },

  // Get productos by proveedor
  getProductosByProveedor: async (id_proveedor) => {
    return await recepcionRepository.getProductosByProveedor(id_proveedor);
  }
};
