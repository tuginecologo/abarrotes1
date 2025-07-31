const proveedorRepository = require('../repositories/proveedorRepository');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');

module.exports = {
  // Get proveedores with pagination and search
  getProveedores: async (page, limit, search) => {
    return await proveedorRepository.getProveedores(page, limit, search);
  },

  // Get single proveedor by ID
  getProveedorById: async (id) => {
    const proveedor = await proveedorRepository.getProveedorById(id);
    if (!proveedor) {
      throw new Error('Proveedor no encontrado');
    }
    return proveedor;
  },

  // Create new proveedor
  createProveedor: async (proveedorData) => {
    return await proveedorRepository.createProveedor(
      proveedorData.nombre,
      proveedorData.ruc,
      proveedorData.telefono,
      proveedorData.email
    );
  },

  // Update proveedor
  updateProveedor: async (id, proveedorData) => {
    return await proveedorRepository.updateProveedor(
      id,
      proveedorData.nombre,
      proveedorData.ruc,
      proveedorData.telefono,
      proveedorData.email
    );
  },

  // Delete proveedor
  deleteProveedor: async (id) => {
    return await proveedorRepository.deleteProveedor(id);
  },

  // Bulk delete proveedores
  // bulkDeleteProveedores: async (ids) => {
  //   if (!ids || ids.length === 0) {
  //     throw new Error('No se proporcionaron IDs de proveedores');
  //   }
  //   return await proveedorRepository.bulkDeleteProveedores(ids);
  // },

  // Export to Excel
  exportToExcel: async () => {
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Proveedores');

    const proveedores = await proveedorRepository.getAllProveedores();

    worksheet.columns = [
      { header: 'ID', key: 'id_proveedor', width: 10 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'RUC', key: 'ruc', width: 20 },
      { header: 'Teléfono', key: 'telefono', width: 20 },
      { header: 'Email', key: 'email', width: 30 }
    ];

    proveedores.forEach(proveedor => {
      worksheet.addRow(proveedor);
    });

    const exportDir = path.join(__dirname, '../public/exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const exportPath = path.join(exportDir, 'proveedores.xlsx');
    await workbook.xlsx.writeFile(exportPath);

    return exportPath;
  }
};