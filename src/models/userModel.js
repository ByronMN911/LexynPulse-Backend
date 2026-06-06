const db = require('../config/db');

/*
 * Busca un registro de usuario en la base de datos utilizando su correo electrónico.
 * Retorna el registro completo incluyendo la relación del rol para validaciones en el backend.
 */
const buscarPorCorreo = async (correo) => {
    const queryText = `
        SELECT u.*, r.nombre AS rol_nombre 
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        WHERE u.correo = $1 AND u.activo = TRUE
    `;
    const { rows } = await db.query(queryText, [correo]);
    return rows[0];
};

/*
 * Inserta un nuevo usuario (cliente) dentro de la base de datos.
 * Aplica restricciones de seguridad asignándole su rol correspondiente.
 */
const crearUsuario = async (userData) => {
    const { 
        nombre_completo, 
        correo, 
        password_hash, 
        rol_id, 
        empresa_nombre, 
        empresa_tamano, 
        empresa_sector 
    } = userData;

    const queryText = `
        INSERT INTO usuarios (
            nombre_completo, correo, password_hash, rol_id, 
            empresa_nombre, empresa_tamano, empresa_sector
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, nombre_completo, correo, rol_id, creado_en
    `;

    const values = [
        nombre_completo, correo, password_hash, rol_id, 
        empresa_nombre, empresa_tamano, empresa_sector
    ];

    const { rows } = await db.query(queryText, values);
    return rows[0];
};

/*
 * Extrae la lista completa de usuarios que ostentan el Rol de CLIENTE (id = 2)
 * exponiendo sus metadatos de segmentación corporativa.
 */
const obtenerTodosClientes = async () => {
    const queryText = `
        SELECT id, nombre_completo, correo, empresa_nombre, empresa_tamano, empresa_sector, activo, creado_en
        FROM usuarios
        WHERE rol_id = 2
        ORDER BY creado_en DESC
    `;
    const { rows } = await db.query(queryText);
    return rows;
};

/*
 * Modifica el perfil de un usuario desde la perspectiva de control del Administrador.
 * Soporta actualización dinámica de contraseña y modificación de correo.
 */
const actualizarUsuarioPorAdmin = async (id, data) => {
    let queryText = `
        UPDATE usuarios
        SET nombre_completo = $1, empresa_nombre = $2, empresa_tamano = $3, empresa_sector = $4, activo = $5, correo = $6
    `;
    const values = [data.nombre_completo, data.empresa_nombre, data.empresa_tamano, data.empresa_sector, data.activo, data.correo];
    
    // Si el payload contiene un nuevo password_hash, lo incluimos en la consulta SQL
    if (data.password_hash) {
        queryText += `, password_hash = $7 WHERE id = $8 RETURNING id, nombre_completo, correo, activo`;
        values.push(data.password_hash, id);
    } else {
        queryText += ` WHERE id = $7 RETURNING id, nombre_completo, correo, activo`;
        values.push(id);
    }

    const { rows } = await db.query(queryText, values);
    return rows[0];
};

module.exports = {
    buscarPorCorreo,
    crearUsuario,
    obtenerTodosClientes,
    actualizarUsuarioPorAdmin
};