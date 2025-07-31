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
      next(err);
    }
  },

  // Export to Excel
  exportToExcel: async (req, res, next) => {
    try {
      const filePath = await stockService.exportToExcel();
      res.download(filePath, 'stock.xlsx', (err) => {
        if (err) {
          console.error(err);
          res.redirect('/stock?error=export');
        }
      });
    } catch (err) {
      next(err);
    }
  }
};