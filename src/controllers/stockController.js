// In stockController.js - improve error handling
const stockService = require('../services/stockService');

module.exports = {
  // List stock with pagination and search
  listStock: async (req, res, next) => {
    try {
      console.log('Entering listStock controller');
      const { page = 1, limit = 10, q = '' } = req.query;
      console.log(`Params - page: ${page}, limit: ${limit}, search: ${q}`);

      const result = await stockService.getStock(parseInt(page), parseInt(limit), q);
      console.log('Stock data retrieved:', result.stock);

      res.render('stock/list', {
        stock: result.stock,
        currentPage: parseInt(page),
        totalPages: result.totalPages,
        searchQuery: q
      });
    } catch (err) {
      console.error('Error in listStock:', err);
      
      // Check if it's a connection error
      if (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST') {
        req.flash('error', 'Error de conexión con la base de datos. Por favor, intente nuevamente.');
      } else {
        req.flash('error', 'Error al cargar el inventario');
      }
      
      // Render the page with empty stock and error message
      res.render('stock/list', {
        stock: [],
        currentPage: 1,
        totalPages: 1,
        searchQuery: q || ''
      });
    }
  },

  // Export to Excel
  exportToExcel: async (req, res, next) => {
    try {
      const filePath = await stockService.exportToExcel();
      res.download(filePath, 'stock.xlsx', (err) => {
        if (err) {
          console.error(err);
          req.flash('error', 'Error al descargar el archivo');
          res.redirect('/stock');
        }
      });
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      req.flash('error', 'Error al generar el archivo Excel');
      res.redirect('/stock');
    }
  }
};