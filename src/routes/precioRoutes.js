const { Router } = require('express');
const router = Router();
const precioController = require('../controllers/precioController');
const { checkAuth, checkRole } = require('../middlewares/auth');
const asyncWrapper = require('../utils/asyncWrapper');

// List public products
router.get('/precio', checkAuth, checkRole(['0', '1']), asyncWrapper(precioController.listPrecios));

// New public product flow
router.route('/precio/nuevo')
  .get(checkAuth, checkRole(['0', '1']), asyncWrapper(precioController.showNewForm))
  .post(checkAuth, checkRole(['0', '1']), asyncWrapper(precioController.createPrecio));

// Edit public product flow
router.route('/precio/editar/:id')
  .get(checkAuth, checkRole(['0', '1']), asyncWrapper(precioController.showEditForm))
  .post(checkAuth, checkRole(['0', '1']), asyncWrapper(precioController.updatePrecio));

// Delete public product
// router.post('/productopublico/eliminar/:id', checkAuth, asyncWrapper(productopublicoController.deleteProductoPublico));

// Export to Excel
router.get('/precio/exportar', checkAuth, checkRole(['0', '1']), asyncWrapper(precioController.exportToExcel));

module.exports = router;