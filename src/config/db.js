const { Pool } = require('pg');
require('dotenv').config();

// 1. Validamos que la variable exista realmente
if (!process.env.DATABASE_URL) {
    console.error("ERROR CRÍTICO: No se encontró DATABASE_URL en el archivo .env");
    process.exit(1); // Detiene el servidor si no hay base de datos
}

// 2. Limpiamos cualquier rastro de sslmode en la URL por si acaso quedó alguno
const dbUrlLimpia = process.env.DATABASE_URL.replace('?sslmode=require', '');

/*
 * Pool de conexiones PostgreSQL configurado para Cloud Deployment.
 */
const pool = new Pool({
    connectionString: dbUrlLimpia,
    ssl: {
        rejectUnauthorized: false // Fundamental para conectarse a Neon o Render
    }
});

/*
 * Verificación inicial de conectividad.
 */
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error crítico al conectar a PostgreSQL en la nube:', err.stack);
    } else {
        console.log('Conexión a PostgreSQL (Neon.tech) establecida con éxito:', res.rows[0].now);
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};