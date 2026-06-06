const express = require('express');
const router = express.Router();
const preguntaController = require('../controllers/preguntaController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

/*
 * Cableado de Endpoints de Mantenimiento de Catálogos.
 * Rutas restringidas de forma absoluta al perfil de ADMINISTRADOR.
 */
router.get('/dashboard', verificarToken, permitirRoles('ADMINISTRADOR'), preguntaController.obtenerPreguntasAdmin);
router.post('/', verificarToken, permitirRoles('ADMINISTRADOR'), preguntaController.guardarPregunta);
router.put('/:id', verificarToken, permitirRoles('ADMINISTRADOR'), preguntaController.actualizarPreguntaAdmin);

module.exports = router;