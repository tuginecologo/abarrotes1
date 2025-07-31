// routes/cargoRoutes.js
const { Router } = require('express');
const router = Router();
const cargoController = require('../controllers/cargoController');
const { checkAuth, checkRole } = require('../middlewares/auth');
const asyncWrapper = require('../utils/asyncWrapper');

// List cargos
router.get('/cargos', checkAuth, checkRole(['0', '1']), asyncWrapper(cargoController.listCargos));

// Cargo creation flow
router.route('/cargos/nuevo')
  .get(checkAuth, checkRole(['0', '1']), cargoController.showNewForm)
  .post(checkAuth, checkRole(['0', '1']), asyncWrapper(cargoController.createCargo));

// Cargo edit flow
router.route('/cargos/editar/:id')
  .get(checkAuth, checkRole(['0', '1']), asyncWrapper(cargoController.showEditForm))
  .post(checkAuth, checkRole(['0', '1']), asyncWrapper(cargoController.updateCargo));

// Delete operations
router.post('/cargos/eliminar/:id', checkAuth, checkRole(['0', '1']), asyncWrapper(cargoController.deleteCargo));
// router.post('/cargos/bulk-delete', checkAuth, checkRole(['0', '1']), asyncWrapper(cargoController.bulkDeleteCargos));

// Excel export
router.get('/cargos/exportar', checkAuth, checkRole(['0', '1']), asyncWrapper(cargoController.exportToExcel));

module.exports = router;