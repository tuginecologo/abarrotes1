const { Router } = require('express');
const router = Router();
const ventaController = require('../controllers/ventaController');
const { checkAuth, checkRole } = require('../middlewares/auth');
const asyncWrapper = require('../utils/asyncWrapper');

// Export to excel
router.get('/ventas/exportar', 
    checkAuth, 
    checkRole(['0', '1']), 
    asyncWrapper(ventaController.exportToExcel)
  );
// Sales routes
router.get('/ventas', checkAuth, checkRole(['0', '1', '2']), asyncWrapper (ventaController.listVentas));
router.get('/ventas/nueva', checkAuth, checkRole(['0', '1', '2']), asyncWrapper(ventaController.showNewForm));
router.post('/ventas/nueva', checkAuth, checkRole(['0', '1', '2']), asyncWrapper(ventaController.createVenta));
router.get('/ventas/:id', checkAuth, checkRole(['0', '1', '2']), asyncWrapper(ventaController.getVentaDetails));
// Add these new routes
router.get('/ventas/:id/devolver', checkAuth, checkRole(['0', '1', '2']), asyncWrapper(ventaController.showReturnForm));
router.post('/ventas/:id/devolver', checkAuth, checkRole(['0', '1', '2']), asyncWrapper(ventaController.processReturn));
router.get('/ventas/:id/historial', checkAuth, checkRole(['0', '1', '2']), asyncWrapper(ventaController.getVentaHistory));

module.exports = router;