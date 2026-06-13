const express = require('express');
const router = express.Router();
const evaluacionController = require('../controllers/evaluacionController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');


/*
 * Rutas operativas del Módulo de Clientes.
    Ver cuestionario, rendir evaluación, ver historial y reportes individuales.
 */

router.get('/cuestionario', verificarToken, evaluacionController.obtenerCuestionario);
router.post('/procesar', verificarToken, permitirRoles('CLIENTE'), evaluacionController.procesarEvaluacion);
router.get('/usuario/:id', verificarToken, evaluacionController.listarHistorial);
router.get('/reporte/:id', verificarToken, permitirRoles('CLIENTE', 'ADMINISTRADOR'), evaluacionController.obtenerReporte);

/*
 * Ruta Maestra de Telemetría Global (Alcance exclusivo para el dashboard del Administrador).
 */
router.get('/dashboard', verificarToken, permitirRoles('ADMINISTRADOR'), evaluacionController.obtenerDashboardGlobal); 

// Ruta para validar el código de verificación de un reporte de evaluación
router.get('/verificar/:codigo', evaluacionController.verificarReporte);
module.exports = router;

