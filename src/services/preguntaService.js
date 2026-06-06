const db = require('../config/db');
const preguntaModel = require('../models/preguntaModel');

/*
 * Procesa la lectura del catálogo completo para el Administrador, estructurando
 * las filas planas en un árbol JSON ordenado por componentes relacionales.
 */
const listarPreguntasDashboard = async () => {
    const filas = await preguntaModel.obtenerTodasPreguntasDashboard();
    const preguntasMap = {};

    filas.forEach(fila => {
        if (!preguntasMap[fila.pregunta_id]) {
            preguntasMap[fila.pregunta_id] = {
                id: fila.pregunta_id,
                texto_pregunta: fila.texto_pregunta,
                tipo_categoria: fila.tipo_categoria,
                peso_porcentaje: parseFloat(fila.peso_porcentaje),
                activo: fila.activo,
                opciones: []
            };
        }
        if (fila.opcion_id) {
            preguntasMap[fila.pregunta_id].opciones.push({
                id: fila.opcion_id,
                literal: fila.literal,
                texto_opcion: fila.texto_opcion,
                puntaje_riesgo: parseFloat(fila.puntaje_riesgo)
            });
        }
    });

    return Object.values(preguntasMap);
};

/*
 * Gestiona el flujo transaccional para la creación de una nueva pregunta corporativa.
 * Aplica de forma obligatoria la validación de control de peso al 100% (RF-08).
 */
const crearNuevaPregunta = async (datosPregunta) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN'); // Apertura de la transacción

        // 1. Inserción de la cabecera de la pregunta
        const preguntaId = await preguntaModel.insertarPreguntaTransaccional(
            client, datosPregunta.texto_pregunta, datosPregunta.tipo_categoria, datosPregunta.peso_porcentaje
        );

        // 2. Inserción secuencial de sus 4 opciones de respuesta correspondientes
        for (const op of datosPregunta.opciones) {
            await preguntaModel.insertarOpcionTransaccional(
                client, preguntaId, op.literal, op.texto_opcion, op.puntaje_riesgo
            );
        }

        await client.query('COMMIT'); // Consolidación en disco
        return { preguntaId, mensaje: 'Pregunta y opciones grabadas en cumplimiento legal.' };

    } catch (error) {
        await client.query('ROLLBACK'); // Aborta los cambios en caso de descuadre
        throw error;
    } finally {
        client.release(); // Retorna la conexión al Pool
    }
};

/*
 * Procesa la actualización de una pregunta y de sus opciones de respuesta correspondientes.
 */
const modificarPregunta = async (id, datosActualizados) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Actualiza la cabecera
        await preguntaModel.actualizarPregunta(
            client, id, datosActualizados.texto_pregunta, datosActualizados.tipo_categoria,
            datosActualizados.peso_porcentaje, datosActualizados.activo
        );

        // 2. Actualiza las opciones de respuesta si fueron enviadas
        if (datosActualizados.opciones && datosActualizados.opciones.length > 0) {
            for (const op of datosActualizados.opciones) {
                // Se requiere enviar el ID de la opción para saber cuál actualizar
                await preguntaModel.actualizarOpcionTransaccional(
                    client, op.id, op.texto_opcion, op.puntaje_riesgo
                );
            }
        }

        await client.query('COMMIT');
        return { message: 'Pregunta y opciones modificadas con éxito.' };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
module.exports = {
    listarPreguntasDashboard,
    crearNuevaPregunta,
    modificarPregunta
};