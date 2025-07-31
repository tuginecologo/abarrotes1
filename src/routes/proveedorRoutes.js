const { Router } = require('express');
const router = Router();
const proveedorController = require('../controllers/proveedorController');
const { checkAuth, checkRole } = require('../middlewares/auth');
const asyncWrapper = require('../utils/asyncWrapper');

// List proveedores
router.get('/proveedores', checkAuth, checkRole(['0', '1']), asyncWrapper(proveedorController.listProveedores));

// Proveedor creation flow
router.route('/proveedores/nuevo')
  .get(checkAuth, checkRole(['0', '1']), proveedorController.showNewForm)
  .post(checkAuth, checkRole(['0', '1']), asyncWrapper(proveedorController.createProveedor));

// Proveedor edit flow
router.route('/proveedores/editar/:id')
  .get(checkAuth, checkRole(['0', '1']), asyncWrapper(proveedorController.showEditForm))
  .post(checkAuth, checkRole(['0', '1']), asyncWrapper(proveedorController.updateProveedor));

// Delete operations
router.post('/proveedores/eliminar/:id', checkAuth, checkRole(['0', '1']), asyncWrapper(proveedorController.deleteProveedor));
// router.post('/proveedores/bulk-delete', checkAuth, checkRole(['0', '1']), asyncWrapper(proveedorController.bulkDeleteProveedores));

// Excel export
router.get('/proveedores/exportar', checkAuth, checkRole(['0', '1']), asyncWrapper(proveedorController.exportToExcel));

module.exports = router;