const { Pool } = require('pg');
require('dotenv').config();

const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
    console.error("ERROR CRÍTICO: No se encontró DATABASE_URL en el archivo .env");
    process.exit(1);
}

// LIMPIEZA TOTAL: Nos quedamos solo con la parte izquierda de la URL (sin parámetros)
const dbUrlLimpia = rawUrl.split('?')[0];

// DETECCIÓN INTELIGENTE
const isLocal = dbUrlLimpia.includes('localhost');

console.log(`Intentando conectar a: ${dbUrlLimpia} (Modo: ${isLocal ? 'LOCAL' : 'NUBE'})`);

const pool = new Pool({
    connectionString: dbUrlLimpia,
    // Si es local, no usamos SSL (false). Si es nube, usamos {rejectUnauthorized: false}
    ssl: isLocal ? false : { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error al conectar a la DB:', err.stack);
    } else {
        console.log('¡Conexión establecida correctamente!');
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};