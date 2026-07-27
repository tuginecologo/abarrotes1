const { Router } = require('express');
const router = Router();
const deudaController = require('../controllers/deudaController');
const { checkAuth, checkRole } = require('../middlewares/auth');
const asyncWrapper = require('../utils/asyncWrapper');

router.get('/deudas', checkAuth, checkRole(['0', '1']), asyncWrapper(deudaController.listarDeudas));
router.get('/deudas/cliente/:id', checkAuth, checkRole(['0', '1']), asyncWrapper(deudaController.verDeuda));
router.get('/deudas/pagar/:id', checkAuth, checkRole(['0', '1']), asyncWrapper(deudaController.showPagoForm));
router.post('/deudas/pagar', checkAuth, checkRole(['0', '1']), asyncWrapper(deudaController.registrarPago));
// Ruta para revertir pago
router.post('/deudas/pagar/revertir/:id_pago', checkAuth, checkRole(['0', '1']), asyncWrapper(deudaController.revertirPago));

module.exports = router;