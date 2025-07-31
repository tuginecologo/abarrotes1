const { Router } = require('express');
const router = Router();
const productoController = require('../controllers/productoController');
const { checkAuth, checkRole } = require('../middlewares/auth');
const asyncWrapper = require('../utils/asyncWrapper');

// List products
router.get('/productos', checkAuth, asyncWrapper(productoController.listProducts));

// Product creation flow
router.route('/productos/nuevo')
  .get(checkAuth, checkRole(['0', '1']), productoController.showNewForm)
  .post(checkAuth, checkRole(['0', '1']), asyncWrapper(productoController.createProduct));

// Product edit flow
router.route('/productos/editar/:id')
  .get(checkAuth, checkRole(['0', '1']), asyncWrapper(productoController.showEditForm))
  .post(checkAuth, checkRole(['0', '1']), asyncWrapper(productoController.updateProduct));

// Delete operations
router.post('/productos/eliminar/:id', checkAuth, checkRole(['0', '1']), asyncWrapper(productoController.deleteProduct));
// router.post('/productos/bulk-delete', checkAuth, checkRole(['0', '1']), asyncWrapper(productoController.bulkDeleteProducts));

// Excel export
router.get('/productos/exportar', checkAuth, checkRole(['0', '1']), asyncWrapper(productoController.exportToExcel));

module.exports = router;