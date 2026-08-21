const { Router } = require('express');
const router = Router();
const gananciaController = require('../controllers/gananciaController');
const { checkAuth, checkRole } = require('../middlewares/auth');
const asyncWrapper = require('../utils/asyncWrapper');

router.get('/ganancias', checkAuth, checkRole(['0', '1']), asyncWrapper(gananciaController.listGanancias));
router.get('/ganancias/exportar', checkAuth, checkRole(['0', '1']), asyncWrapper(gananciaController.exportGananciasExcel));

module.exports = router;
