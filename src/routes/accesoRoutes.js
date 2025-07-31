const { Router } = require('express');
const router = Router();
const accesoController = require('../controllers/accesoController');
const { checkAuth, checkRole } = require('../middlewares/auth');
const asyncWrapper = require('../utils/asyncWrapper');

router.get('/accesos', checkAuth, checkRole(['0']), asyncWrapper(accesoController.listAccesos));

router.route('/accesos/nuevo')
  .get(checkAuth, checkRole(['0']), asyncWrapper(accesoController.showNewForm))
  .post(checkAuth, checkRole(['0']), asyncWrapper(accesoController.createAcceso));

router.route('/accesos/editar/:dni')
  .get(checkAuth, checkRole(['0']), asyncWrapper(accesoController.showEditForm))
  .post(checkAuth, checkRole(['0']), asyncWrapper(accesoController.updateAcceso));

router.post('/accesos/eliminar/:dni', checkAuth, checkRole(['0']), asyncWrapper(accesoController.deleteAcceso));
// router.post('/accesos/bulk-delete', checkAuth, checkRole(['0']), asyncWrapper(accesoController.bulkDeleteAccesos));
// router.get('/accesos/exportar', checkAuth, checkRole(['0']), asyncWrapper(accesoController.exportToExcel));

module.exports = router;