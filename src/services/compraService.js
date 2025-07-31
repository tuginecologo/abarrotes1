const compraRepository = require('../repositories/compraRepository');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');

module.exports = {
  // Get compras with pagination and search
  getCompras: async (page, limit, search) => {
    return await compraRepository.getCompras(page, limit, search);
  },

  // Get single compra by ID
  getCompraById: async (id) => {
    const compra = await compraRepository.getCompraById(id);
    if (!compra) {
      throw new Error('Compra no encontrada');
    }
    return compra;
  },

  // Create new compra
  createCompra: async (compraData) => {
    return await compraRepository.createCompra(
      compraData.cantidad,
      compraData.preciounitario,
      compraData.id_producto,
      compraData.id_proveedor,
      compraData.dni,
      compraData.fecha,
      compraData.observacion
    );
  },

  // Update compra
  updateCompra: async (id, compraData) => {
    return await compraRepository.updateCompra(
      id,
      compraData.cantidad,
      compraData.preciounitario,
      compraData.id_producto,
      compraData.id_proveedor,
      compraData.dni,
      compraData.fecha,
      compraData.observacion
    );
  },

  // Delete compra
  deleteCompra: async (id) => {
    return await compraRepository.deleteCompra(id);
  },

  // Bulk delete compras
  // bulkDeleteCompras: async (ids) => {
  //   if (!ids || ids.length === 0) {
  //     throw new Error('No se proporcionaron IDs de compras');
  //   }
  //   return await compraRepository.bulkDeleteCompras(ids);
  // },

  // Export to Excel
  exportToExcel: async () => {
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Compras');

    const compras = await compraRepository.getAllCompras();

    worksheet.columns = [
      { header: 'ID', key: 'id_compra', width: 10 },
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Producto', key: 'producto_nombre', width: 30 },
      { header: 'Cantidad', key: 'cantidad', width: 15 },
      { header: 'Precio Unitario', key: 'preciounitario', width: 20 },
      { header: 'Total', key: 'total', width: 20 },
      { header: 'Proveedor', key: 'proveedor_nombre', width: 30 },
      { header: 'Empleado', key: 'empleado_nombre', width: 30 },
      { header: 'Observación', key: 'observacion', width: 40 }
    ];

    compras.forEach(compra => {
      worksheet.addRow({
        ...compra,
        total: compra.cantidad * compra.preciounitario
      });
    });

    // Format currency
    worksheet.eachRow((row) => {
      row.getCell('preciounitario').numFmt = '"S/"#,##0.00';
      row.getCell('total').numFmt = '"S/"#,##0.00';
    });

    const exportDir = path.join(__dirname, '../public/exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const exportPath = path.join(exportDir, 'compras.xlsx');
    await workbook.xlsx.writeFile(exportPath);

    return exportPath;
  },

  // Get dropdown options
  getDropdownOptions: async () => {
    return await compraRepository.getDropdownOptions();
  }
};