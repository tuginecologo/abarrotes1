const { Router } = require('express');
const router = Router();
const incidenciaController = require('../controllers/incidenciaController');
const { checkAuth, checkRole } = require('../middlewares/auth');
const asyncWrapper = require('../utils/asyncWrapper');

// Incidencias routes
router.get('/incidencias', checkAuth, checkRole(['0', '1']), asyncWrapper(incidenciaController.listIncidencias));
router.get('/incidencias/nueva', checkAuth, checkRole(['0', '1']), asyncWrapper(incidenciaController.showNewForm));
router.post('/incidencias/nueva', checkAuth, checkRole(['0', '1']), asyncWrapper(incidenciaController.createIncidencia));
router.get('/incidencias/:id', checkAuth, checkRole(['0', '1']), asyncWrapper(incidenciaController.getIncidenciaDetails));
router.get('/incidencias/:id/editar', checkAuth, checkRole(['0', '1']), asyncWrapper(incidenciaController.showEditForm));
router.post('/incidencias/:id/editar', checkAuth, checkRole(['0', '1']), asyncWrapper(incidenciaController.updateIncidencia));
router.post('/incidencias/:id/eliminar', checkAuth, checkRole(['0', '1']), asyncWrapper(incidenciaController.deleteIncidencia));
router.get('/incidencias/exportar', checkAuth, checkRole(['0', '1']), asyncWrapper(incidenciaController.exportToExcel));

module.exports = router;