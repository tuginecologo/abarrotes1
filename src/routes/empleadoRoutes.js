const { Router } = require('express');
const router = Router();
const empleadoController = require('../controllers/empleadoController');
const { checkAuth, checkRole } = require('../middlewares/auth');
const { uploadEmployeeImage } = require('../middlewares/upload');
const asyncWrapper = require('../utils/asyncWrapper');

// List employees
router.get('/empleados', checkAuth, checkRole(['0', '1']), asyncWrapper(empleadoController.listEmpleados));
// Add to your empleadoRoutes.js
router.get('/test-image/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, '../uploads', req.params.filename));
  });

// Employee creation flow
router.route('/empleados/nuevo')
  .get(checkAuth, checkRole(['0', '1']), asyncWrapper(empleadoController.showNewForm))
  .post(checkAuth, uploadEmployeeImage.single('imagen'), checkRole(['0', '1']), asyncWrapper(empleadoController.createEmpleado));

// Employee edit flow
router.route('/empleados/editar/:dni')
  .get(checkAuth, checkRole(['0', '1']), asyncWrapper(empleadoController.showEditForm));
  // .post(checkAuth, uploadEmployeeImage.single('imagen'), checkRole(['0', '1']), asyncWrapper(empleadoController.updateEmpleado));

// Replace delete routes with:
router.post('/empleados/terminar/:dni', checkAuth, checkRole(['0', '1']), asyncWrapper(empleadoController.terminateEmpleado));
router.get('/empleados/terminar/:dni', checkAuth, checkRole(['0', '1']), asyncWrapper(empleadoController.showTerminateForm));

router.get('/empleados/ex-empleados', checkAuth,checkRole(['0', '1']), asyncWrapper(empleadoController.listExEmpleados));
router.post('/empleados/recontratar/:dni', checkAuth, checkRole(['0', '1']), asyncWrapper(empleadoController.rehireEmpleado));

// Excel export
router.get('/empleados/exportar', checkAuth, checkRole(['0', '1']), asyncWrapper(empleadoController.exportToExcel));

// Image upload endpoint
// router.post('/empleados/imagen/:dni', checkAuth, uploadEmployeeImage.single('imagen'), checkRole(['0', '1']), asyncWrapper(empleadoController.saveEmpleadoImage));

module.exports = router;