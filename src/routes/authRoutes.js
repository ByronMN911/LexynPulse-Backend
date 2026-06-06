const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

/*
 * Definición de rutas públicas de autenticación.
 */
router.post('/login', authController.login);

/*
 * Definición de rutas privadas protegidas.
 * Solo usuarios autenticados con rol 'ADMINISTRADOR' pueden registrar nuevos usuarios.
 */
router.post('/register', verificarToken, permitirRoles('ADMINISTRADOR'), authController.registrar);
router.get('/clientes', verificarToken, permitirRoles('ADMINISTRADOR'), authController.obtenerClientes); 
router.put('/clientes/:id', verificarToken, permitirRoles('ADMINISTRADOR'), authController.actualizarCliente); 

module.exports = router;