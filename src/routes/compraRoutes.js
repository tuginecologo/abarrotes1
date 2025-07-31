const { Router } = require('express');
const router = Router();
const compraController = require('../controllers/compraController');
const { checkAuth, checkRole } = require('../middlewares/auth');
const asyncWrapper = require('../utils/asyncWrapper');

// List compras
router.get('/compras', checkAuth, checkRole(['0', '1']), asyncWrapper(compraController.listCompras));

// Compra creation flow
router.route('/compras/nuevo')
  .get(checkAuth, checkRole(['0', '1']), asyncWrapper(compraController.showNewForm))
  .post(checkAuth, checkRole(['0', '1']), asyncWrapper(compraController.createCompra));

// Compra edit flow
router.route('/compras/editar/:id')
  .get(checkAuth, checkRole(['0', '1']), asyncWrapper(compraController.showEditForm))
  .post(checkAuth, checkRole(['0', '1']), asyncWrapper(compraController.updateCompra));

// Delete operations
router.post('/compras/eliminar/:id', checkAuth, checkRole(['0', '1']), asyncWrapper(compraController.deleteCompra));
// router.post('/compras/bulk-delete', checkAuth, checkRole(['0', '1']), asyncWrapper(compraController.bulkDeleteCompras));

// Excel export
router.get('/compras/exportar', checkAuth, checkRole(['0', '1']), asyncWrapper(compraController.exportToExcel));

module.exports = router;