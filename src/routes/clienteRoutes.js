const { Router } = require('express');
const router = Router();
const clienteController = require('../controllers/clienteController');
const { checkAuth, checkRole } = require('../middlewares/auth');
const asyncWrapper = require('../utils/asyncWrapper');

// List clients
router.get('/clientes', checkAuth, checkRole(['0', '1']), asyncWrapper(clienteController.listClientes));

// Client creation flow
router.route('/clientes/nuevo')
  .get(checkAuth, checkRole(['0', '1']), clienteController.showNewForm)
  .post(checkAuth, checkRole(['0', '1']), asyncWrapper(clienteController.createCliente));

// Client edit flow
router.route('/clientes/editar/:dni')
  .get(checkAuth, checkRole(['0', '1']), asyncWrapper(clienteController.showEditForm))
  .post(checkAuth, checkRole(['0', '1']), asyncWrapper(clienteController.updateCliente));

// Delete operations
router.post('/clientes/eliminar/:dni', checkAuth, checkRole(['0', '1']), asyncWrapper(clienteController.deleteCliente));
// router.post('/clientes/bulk-delete', checkAuth, checkRole(['0', '1']), asyncWrapper(clienteController.bulkDeleteClientes));

// Excel export
router.get('/clientes/exportar', checkAuth, checkRole(['0', '1']), asyncWrapper(clienteController.exportToExcel));

module.exports = router;