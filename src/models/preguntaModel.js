const db = require('../config/db');

/*
 * Recupera el universo completo de preguntas (tanto activas como inactivas)
 * junto con sus respectivas opciones de respuesta para el panel de control del administrador.
 */
const obtenerTodasPreguntasDashboard = async () => {
    const queryText = `
        SELECT 
            p.id AS pregunta_id, p.texto_pregunta, p.tipo_categoria, p.peso_porcentaje, p.activo,
            o.id AS opcion_id, o.literal, o.texto_opcion, o.puntaje_riesgo
        FROM preguntas p
        LEFT JOIN opciones_respuesta o ON p.id = o.pregunta_id
        ORDER BY p.id ASC, o.literal ASC
    `;
    const { rows } = await db.query(queryText);
    return rows;
};

/*
 * Inserta la cabecera de una nueva pregunta dentro de un entorno transaccional.
 * Retorna el ID generado secuencialmente por el motor relacional.
 */
const insertarPreguntaTransaccional = async (client, texto, categoria, peso) => {
    const queryText = `
        INSERT INTO preguntas (texto_pregunta, tipo_categoria, peso_porcentaje, activo)
        VALUES ($1, $2, $3, TRUE)
        RETURNING id
    `;
    const { rows } = await client.query(queryText, [texto, categoria, peso]);
    return rows[0].id;
};

/*
 * Inserta una opción de respuesta individual amarrada a una pregunta específica
 * dentro de un entorno transaccional controlado.
 */
const insertarOpcionTransaccional = async (client, preguntaId, literal, textoOpcion, puntaje) => {
    const queryText = `
        INSERT INTO opciones_respuesta (pregunta_id, literal, texto_opcion, puntaje_riesgo)
        VALUES ($1, $2, $3, $4)
    `;
    await client.query(queryText, [preguntaId, literal, textoOpcion, puntaje]);
};

/*
 * Modifica los atributos principales de una pregunta o ejecuta su borrado lógico
 * mediante la alteración del campo 'activo'.
 */
const actualizarPregunta = async (client, id, texto, categoria, peso, activo) => {
    const queryText = `
        UPDATE preguntas
        SET texto_pregunta = $1, tipo_categoria = $2, peso_porcentaje = $3, activo = $4
        WHERE id = $5
    `;
    await client.query(queryText, [texto, categoria, peso, activo, id]);
};

/*
 * Ejecuta la sumatoria matemática del peso de todas las preguntas operativas (activas)
 * para realizar la validación regulatoria del 100%.
 */
const calcularSumaPesosActivos = async (client) => {
    const queryText = `
        SELECT COALESCE(SUM(peso_porcentaje), 0) AS total_peso 
        FROM preguntas 
        WHERE activo = TRUE
    `;
    const { rows } = await client.query(queryText);
    return parseFloat(rows[0].total_peso);
};

/*
 * Modifica los atributos de una opción de respuesta específica dentro de un entorno transaccional.
 */
const actualizarOpcionTransaccional = async (client, id, textoOpcion, puntaje) => {
    const queryText = `
        UPDATE opciones_respuesta
        SET texto_opcion = $1, puntaje_riesgo = $2
        WHERE id = $3
    `;
    await client.query(queryText, [textoOpcion, puntaje, id]);
};

module.exports = {
    obtenerTodasPreguntasDashboard,
    insertarPreguntaTransaccional,
    insertarOpcionTransaccional,
    actualizarOpcionTransaccional,
    actualizarPregunta,
    calcularSumaPesosActivos
};