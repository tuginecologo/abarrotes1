const recepcionRepository = require('../repositories/recepcionRepository');
const { Router } = require('express');
const router = Router();
const recepcionController = require('../controllers/recepcionController');
const { checkAuth, checkRole } = require('../middlewares/auth');
const asyncWrapper = require('../utils/asyncWrapper');

// List recepciones
router.get('/recepciones', checkAuth, checkRole(['0', '1']), asyncWrapper(recepcionController.listRecepciones));

// Recepcion creation flow
router.route('/recepciones/nuevo')
  .get(checkAuth, checkRole(['0', '1']), asyncWrapper(recepcionController.showNewForm))
  .post(checkAuth, checkRole(['0', '1']), asyncWrapper(recepcionController.createRecepcion));

// Add this new route for dynamic product loading
router.get('/recepciones/productos-por-proveedor/:id_proveedor', 
    checkAuth, 
    checkRole(['0', '1']), asyncWrapper(async (req, res) => {
      const productos = await recepcionRepository.getProductosByProveedor(req.params.id_proveedor);
      res.json(productos);
    })
  );
// Recepcion edit flow
router.route('/recepciones/editar/:id')
  .get(checkAuth, checkRole(['0', '1']), asyncWrapper(recepcionController.showEditForm))
  .post(checkAuth, checkRole(['0', '1']), asyncWrapper(recepcionController.updateRecepcion));

// Delete operations
router.post('/recepciones/eliminar/:id', checkAuth, checkRole(['0', '1']), asyncWrapper(recepcionController.deleteRecepcion));
// router.post('/recepciones/bulk-delete', checkAuth, checkRole(['0', '1']), asyncWrapper(recepcionController.bulkDeleteRecepciones));

// Excel export
router.get('/recepciones/exportar', checkAuth, checkRole(['0', '1']), asyncWrapper(recepcionController.exportToExcel));

module.exports = router;