// services/cargoService.js
const cargoRepository = require('../repositories/cargoRepository');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');

module.exports = {
  // Get cargos with pagination and search
  getCargos: async (page, limit, search) => {
    return await cargoRepository.getCargos(page, limit, search);
  },

  // Get single cargo by ID
  getCargoById: async (id) => {
    const cargo = await cargoRepository.getCargoById(id);
    if (!cargo) {
      throw new Error('Cargo no encontrado');
    }
    return cargo;
  },

  // Create new cargo
  createCargo: async (cargoData) => {
    return await cargoRepository.createCargo(
      cargoData.nombre,
      cargoData.descripcion,
      cargoData.sueldo
    );
  },

  // Update cargo
  updateCargo: async (id, cargoData) => {
    return await cargoRepository.updateCargo(
      id,
      cargoData.nombre,
      cargoData.descripcion,
      cargoData.sueldo
    );
  },

  // Delete cargo
  deleteCargo: async (id) => {
    return await cargoRepository.deleteCargo(id);
  },

  // // Bulk delete cargos
  // bulkDeleteCargos: async (ids) => {
  //   if (!ids || ids.length === 0) {
  //     throw new Error('No se proporcionaron IDs de cargos');
  //   }
  //   return await cargoRepository.bulkDeleteCargos(ids);
  // },

  // Export to Excel
  exportToExcel: async () => {
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Cargos');

    const [cargos] = await pool.query('SELECT * FROM cargo');

    worksheet.columns = [
      { header: 'ID', key: 'id_cargo', width: 10 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Sueldo', key: 'sueldo', width: 15 }
    ];

    cargos.forEach(cargo => {
      worksheet.addRow(cargo);
    });

    const exportDir = path.join(__dirname, '../public/exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const exportPath = path.join(exportDir, 'cargos.xlsx');
    await workbook.xlsx.writeFile(exportPath);

    return exportPath;
  }
};