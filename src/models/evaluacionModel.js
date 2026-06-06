const db = require('../config/db');

/*
 * Extrae la lista completa de preguntas activas junto con todas sus
 * opciones de respuesta asociadas, ordenadas de manera correlativa.
 */
const obtenerCuestionarioCompleto = async () => {
    const queryText = `
        SELECT 
            p.id AS pregunta_id, p.texto_pregunta, p.tipo_categoria, p.peso_porcentaje,
            o.id AS opcion_id, o.literal, o.texto_opcion, o.puntaje_riesgo
        FROM preguntas p
        JOIN opciones_respuesta o ON p.id = o.pregunta_id
        WHERE p.activo = TRUE
        ORDER BY p.id ASC, o.literal ASC
    `;
    const { rows } = await db.query(queryText);
    return rows;
};

/*
 * Registra la cabecera de la evaluación dentro de una transacción.
 * Guarda la fotografía estática de los resultados financieros y de scoring.
 */
const insertarCabecera = async (client, data) => {
    const queryText = `
        INSERT INTO evaluaciones (
            usuario_id, empresa_tamano_momento, empresa_sector_momento,
            score_base, multiplicador_contexto, score_final, nivel_riesgo,
            producto_recomendado, precio_pulse, precio_sentinel, precio_care_mensual,
            descuento_sugerido_momento, precio_pulse_con_impuesto, 
            precio_sentinel_con_urgencia_impuesto, analisis_orientacion_ia
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, score_final, nivel_riesgo, producto_recomendado, creado_en
    `;
    
    const values = [
        data.usuario_id, data.empresa_tamano_momento, data.empresa_sector_momento,
        data.score_base, data.multiplicador_contexto, data.score_final, data.nivel_riesgo,
        data.producto_recomendado, data.precio_pulse, data.precio_sentinel, data.precio_care_mensual,
        data.descuento_sugerido_momento, data.precio_pulse_con_impuesto, 
        data.precio_sentinel_con_urgencia_impuesto, data.analisis_orientacion_ia
    ];

    const { rows } = await client.query(queryText, values);
    return rows[0];
};

/*
 * Registra una línea individual de respuesta dentro del detalle de la evaluación,
 * congelando los pesos y puntajes vigentes al momento del test.
 */
const insertarDetalle = async (client, detalle) => {
    const queryText = `
        INSERT INTO detalles_evaluacion (
            evaluacion_id, pregunta_id, opcion_elegida_id, 
            peso_porcentaje_momento, puntaje_riesgo_momento
        )
        VALUES ($1, $2, $3, $4, $5)
    `;
    const values = [
        detalle.evaluacion_id, detalle.pregunta_id, detalle.opcion_elegida_id,
        detalle.peso_porcentaje_momento, detalle.puntaje_riesgo_momento
    ];
    await client.query(queryText, values);
};

/*
 * Obtiene el historial cronológico y resumido de las evaluaciones completadas
 * por un cliente específico para alimentar las tablas del dashboard.
 */
const obtenerHistorialPorUsuario = async (usuarioId) => {
    const queryText = `
        SELECT id, score_final, nivel_riesgo, producto_recomendado, creado_en
        FROM evaluaciones
        WHERE usuario_id = $1
        ORDER BY creado_en DESC
    `;
    const { rows } = await db.query(queryText, [usuarioId]);
    return rows;
};

/*
 * Obtiene la información completa de una cabecera de evaluación específica.
 */
const obtenerEvaluacionPorId = async (id) => {
    const queryText = `
        SELECT * FROM evaluaciones WHERE id = $1
    `;
    const { rows } = await db.query(queryText, [id]);
    return rows[0];
};

/*
 * Recupera las 11 respuestas seleccionadas en un test del pasado,
 * cruzando los textos de las preguntas y literales originales de las opciones.
 */
const obtenerDetallesPorEvaluacionId = async (evaluacionId) => {
    const queryText = `
        SELECT 
            de.pregunta_id, p.texto_pregunta, p.tipo_categoria,
            de.opcion_elegida_id, o.literal, o.texto_opcion,
            de.peso_porcentaje_momento AS peso, de.puntaje_riesgo_momento AS puntaje
        FROM detalles_evaluacion de
        JOIN preguntas p ON de.pregunta_id = p.id
        JOIN opciones_respuesta o ON de.opcion_elegida_id = o.id
        WHERE de.evaluacion_id = $1
        ORDER BY de.pregunta_id ASC
    `;
    const { rows } = await db.query(queryText, [evaluacionId]);
    return rows;
};

/*
 * Recupera el historial universal de diagnósticos completados en el sistema,
 * cruzando los datos con los perfiles de los usuarios para auditoría técnica de la gerencia.
 */
const obtenerTodasEvaluacionesDashboard = async () => {
    const queryText = `
        SELECT 
            e.*, 
            u.nombre_completo AS usuario_nombre, 
            u.correo AS usuario_correo, 
            u.empresa_nombre AS usuario_empresa_actual
        FROM evaluaciones e
        JOIN usuarios u ON e.usuario_id = u.id
        ORDER BY e.creado_en DESC
    `;
    const { rows } = await db.query(queryText);
    return rows;
};

module.exports = {
    obtenerCuestionarioCompleto,
    insertarCabecera,
    insertarDetalle,
    obtenerHistorialPorUsuario,
    obtenerEvaluacionPorId,
    obtenerDetallesPorEvaluacionId,
    obtenerTodasEvaluacionesDashboard
};