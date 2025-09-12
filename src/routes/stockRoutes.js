const { Router } = require('express');
const router = Router();
const stockController = require('../controllers/stockController');
const { checkAuth, checkRole } = require('../middlewares/auth');
const asyncWrapper = require('../utils/asyncWrapper');
const stockService = require('../services/stockService');

// List stock
router.get('/public/stock', asyncWrapper(stockController.publicStock));
router.get('/stock', checkAuth, checkRole(['0', '1']), asyncWrapper(stockController.listStock));

router.get('/stock/init', checkAuth, checkRole(['0', '1']), asyncWrapper(async (req, res) => {
  try {
      await stockService.initializeStock();
      res.redirect('/stock?success=init');
  } catch (error) {
      res.redirect('/stock?error=init');
  }
}));

// Excel export
router.get('/stock/exportar', checkAuth, checkRole(['0', '1']), asyncWrapper(stockController.exportToExcel));


router.get('/stock/debug', checkAuth, checkRole(['0', '1']), async (req, res) => {
    try {
      const stock = await stockRepository.getAllStock();
      res.json({
        success: true,
        data: stock,
        hasVariante: stock.every(item => 'variante' in item),
        firstItemVariante: stock[0]?.variante
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  router.get('/public/stock/:id/media', asyncWrapper(stockController.publicProductMedia));

module.exports = router;