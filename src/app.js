const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Inicialización de la aplicación y carga de configuración base
const app = express();
const PORT = process.env.PORT || 3000;

/*
 * Inicializa la conexión con la base de datos al arranque.
 * La importación ejecuta la configuración y validación inicial
 * definida en el módulo correspondiente.
 */
const db = require('./config/db');

// Importación de enrutadores de módulos
const authRoutes = require('./routes/authRoutes');
const evaluacionRoutes = require('./routes/evaluacionRoutes'); 
const preguntaRoutes = require('./routes/preguntaRoutes');

/*
 * Middleware global de la aplicación.
 * Se centralizan aquí las configuraciones transversales
 * aplicadas a todas las solicitudes entrantes.
 */
// Reemplaza app.use(cors()); con esto:
app.use(cors({
    origin: ['https://lexyn-pulse-frontend-nrhfcal1r-byronmn911s-projects.vercel.app', 'http://localhost:4200'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

/*
 * Habilita el procesamiento automático de cuerpos JSON
 * para solicitudes POST, PUT y PATCH.
 */
app.use(express.json());

/*
 * Inyección de prefijos de enrutamiento del módulo de seguridad.
 */
app.use('/api/auth', authRoutes);
app.use('/api/evaluaciones', evaluacionRoutes); 
app.use('/api/preguntas', preguntaRoutes); 

/*
 * Endpoint de salud (Health Check).
 * Utilizado para monitoreo, validaciones de despliegue
 * y comprobaciones de disponibilidad del servicio.
 */
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Servidor de Lexyn Pulse funcionando perfectamente.',
        timestamp: new Date()
    });
});


/*
 * Inicializa el servidor HTTP y lo expone
 * en el puerto configurado por entorno.
 */
app.listen(PORT, () => {
    console.log(
        `Servidor backend corriendo en: http://localhost:${PORT}`
    );
});