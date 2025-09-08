const incidenciaRepository = require('../repositories/incidenciaRepository');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');

module.exports = {
  // Get incidents with pagination
// In incidenciaService.js - update the getIncidencias method
getIncidencias: async (page, limit, search = '') => {
    return await incidenciaRepository.getIncidencias(page, limit, search);
  },
  // Get incident by ID
  getIncidenciaById: async (id) => {
    return await incidenciaRepository.getIncidenciaById(id);
  },

  // Create new incident
  createIncidencia: async (incidenciaData) => {
    return await incidenciaRepository.createIncidencia(incidenciaData);
  },

  // Update incident
  updateIncidencia: async (id, incidenciaData) => {
    return await incidenciaRepository.updateIncidencia(id, incidenciaData);
  },

  // Delete incident
  deleteIncidencia: async (id) => {
    return await incidenciaRepository.deleteIncidencia(id);
  },

  // Export to Excel
  exportToExcel: async () => {
    try {
      const workbook = new excel.Workbook();
      const worksheet = workbook.addWorksheet('Incidencias');

      // Get all incidents data
      const incidencias = await incidenciaRepository.getAllIncidencias();

      if (!incidencias || incidencias.length === 0) {
        throw new Error('No hay incidencias para exportar');
      }

      // Define columns
      worksheet.columns = [
        { header: 'ID Incidencia', key: 'id_incidencia', width: 15 },
        { header: 'Fecha', key: 'fecha', width: 15 },
        { header: 'Tipo', key: 'tipo', width: 15 },
        { header: 'Descripción', key: 'descripcion', width: 30 },
        { header: 'Empleado', key: 'empleado', width: 30 },
        { header: 'Cantidad de Productos', key: 'items_count', width: 20 }
      ];

      // Add data to worksheet
      incidencias.forEach(incidencia => {
        worksheet.addRow({
          id_incidencia: incidencia.id_incidencia,
          fecha: incidencia.fecha ? new Date(incidencia.fecha).toLocaleDateString() : 'N/A',
          tipo: incidencia.tipo,
          descripcion: incidencia.descripcion || 'N/A',
          empleado: incidencia.empleado || 'N/A',
          items_count: incidencia.items_count || 0
        });
      });

      // Add a sheet for details
      const detailsSheet = workbook.addWorksheet('Detalles');

      // Define columns for details
      detailsSheet.columns = [
        { header: 'ID Incidencia', key: 'id_incidencia', width: 15 },
        { header: 'ID Producto', key: 'id_producto', width: 15 },
        { header: 'Producto', key: 'producto_nombre', width: 30 },
        { header: 'Marca', key: 'marca', width: 20 },
        { header: 'Variante', key: 'variante', width: 20 },
        { header: 'Cantidad', key: 'cantidad', width: 15 }
      ];

      // Add details data
      incidencias.forEach(incidencia => {
        incidencia.detalles.forEach(detalle => {
          detailsSheet.addRow({
            id_incidencia: incidencia.id_incidencia,
            id_producto: detalle.id_producto,
            producto_nombre: detalle.producto_nombre,
            marca: detalle.marca || 'N/A',
            variante: detalle.variante || 'N/A',
            cantidad: detalle.cantidad,
          });
        });
      });

      // Style the header rows
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      });

      detailsSheet.getRow(1).eachCell((cell) => {
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

      const exportPath = path.join(exportDir, 'incidencias.xlsx');
      await workbook.xlsx.writeFile(exportPath);

      return exportPath;
    } catch (error) {
      console.error('Error in exportToExcel:', error);
      throw error;
    }
  }
};