const { Router } = require('express');
const router = Router();
const productoController = require('../controllers/productoController');
const { checkAuth, checkRole } = require('../middlewares/auth');
const asyncWrapper = require('../utils/asyncWrapper');
const { uploadProductImage } = require('../middlewares/upload'); // Add this import

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

// productoRoutes.js - Add these routes

// Media management routes
router.get('/productos/media/:id', checkAuth, checkRole(['0', '1']), asyncWrapper(productoController.showMediaForm));
router.post('/productos/media/:id/imagen', checkAuth, checkRole(['0', '1']), uploadProductImage.single('imagen'), asyncWrapper(productoController.uploadImage));
router.post('/productos/media/:id/video', checkAuth, checkRole(['0', '1']), asyncWrapper(productoController.addVideo));
router.post('/productos/media/:id/imagen/eliminar/:imageId', checkAuth, checkRole(['0', '1']), asyncWrapper(productoController.deleteImage));
router.post('/productos/media/:id/video/eliminar/:videoId', checkAuth, checkRole(['0', '1']), asyncWrapper(productoController.deleteVideo));

module.exports = router;