const gananciaService = require('../services/gananciaService');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');

module.exports = {
  listGanancias: async (req, res, next) => {
    try {
      const ganancias = await gananciaService.getMonthlyEarnings();
      res.render('ganancias/index', { ganancias });
    } catch (err) {
      next(err);
    }
  },

  exportGananciasExcel: async (req, res, next) => {
    try {
      const ganancias = await gananciaService.getMonthlyEarnings();

      const workbook = new excel.Workbook();
      const worksheet = workbook.addWorksheet('Ganancias Mensuales');

      worksheet.columns = [
        { header: 'Mes', key: 'mes', width: 15 },
        { header: 'Ventas Totales (S/)', key: 'total_ventas', width: 20 },
        { header: 'Compras Totales (S/)', key: 'total_compras', width: 20 },
        { header: 'Ventas por Cobrar (S/)', key: 'total_credito_ventas', width: 25 },
        { header: 'Pagos Recibidos (S/)', key: 'total_pagos_credito', width: 25 },
        { header: 'Ganancia Neta (S/)', key: 'ganancia_neta', width: 20 }
      ];

      ganancias.forEach(g => worksheet.addRow(g));

      // Formatear columnas monetarias
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          ['total_ventas', 'total_compras', 'total_credito_ventas', 'total_pagos_credito', 'ganancia_neta'].forEach(key => {
            row.getCell(key).numFmt = '"S/"#,##0.00';
          });
        }
      });

      // Estilo del encabezado
      worksheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      });

      const exportDir = path.join(__dirname, '../public/exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const exportPath = path.join(exportDir, 'ganancias_mensuales.xlsx');
      await workbook.xlsx.writeFile(exportPath);

      res.download(exportPath, 'ganancias_mensuales.xlsx', (err) => {
        if (err) {
          console.error(err);
          res.redirect('/ganancias?error=export');
        }
      });
    } catch (err) {
      next(err);
    }
  }
};