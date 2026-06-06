const { Pool } = require('pg');
require('dotenv').config();

/*
 * Pool de conexiones PostgreSQL.
 * Se utiliza un pool para reutilizar conexiones y evitar crear
 * una nueva conexión por cada petición, mejorando el rendimiento
 * y el manejo concurrente de solicitudes.
 */
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

/*
 * Verificación inicial de conectividad.
 * Ejecuta una consulta simple al iniciar la aplicación para detectar
 * errores de configuración o disponibilidad de la base de datos.
 */
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error(
            'Error crítico al conectar a PostgreSQL:',
            err.stack
        );
    } else {
        console.log(
            'Conexión a PostgreSQL establecida:',
            res.rows[0].now
        );
    }
});

/*
 * Se expone una interfaz mínima para desacoplar el acceso a BD.
 * Esto facilita cambios futuros en la implementación o pruebas.
 */
module.exports = {

    // Wrapper centralizado para consultas SQL
    query: (text, params) => pool.query(text, params),

    /*
     * Se exporta el pool para operaciones avanzadas
     * como transacciones o gestión manual de conexiones.
     */
    pool
};