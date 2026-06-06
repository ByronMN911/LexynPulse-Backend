const preguntaService = require('../services/preguntaService');

/*
 * Intercepta la petición para listar las preguntas del Dashboard de administración.
 */
const obtenerPreguntasAdmin = async (req, res) => {
    try {
        const preguntas = await preguntaService.listarPreguntasDashboard();
        return res.status(200).json(preguntas);
    } catch (error) {
        return res.status(500).json({ message: 'Error al recuperar el catálogo administrativo.' });
    }
};

/*
 * Intercepta la solicitud de creación y aplica validaciones estrictas de seguridad (Backend Validations).
 */
const guardarPregunta = async (req, res) => {
    try {
        const { texto_pregunta, tipo_categoria, peso_porcentaje, opciones } = req.body;
        
        if (!texto_pregunta || !tipo_categoria || peso_porcentaje === undefined || !opciones || opciones.length === 0) {
            return res.status(400).json({ message: 'Estructura de payload incompleta.' });
        }

        // VALIDACIÓN DE SEGURIDAD DEL BACKEND
        if (peso_porcentaje <= 0 || peso_porcentaje > 1) {
            return res.status(400).json({ message: 'Validación fallida: El peso de la pregunta debe estar entre 0.001 y 1.0' });
        }

        for (let op of opciones) {
            if (op.puntaje_riesgo < 0 || op.puntaje_riesgo > 10) {
                return res.status(400).json({ message: 'Validación fallida: El puntaje de riesgo debe estar entre 0 y 10.' });
            }
        }

        const resultado = await preguntaService.crearNuevaPregunta({ texto_pregunta, tipo_categoria, peso_porcentaje, opciones });
        return res.status(201).json(resultado);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

/*
 * Intercepta la solicitud de actualización y aplica las mismas validaciones de seguridad.
 */
const actualizarPreguntaAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { texto_pregunta, tipo_categoria, peso_porcentaje, activo, opciones } = req.body;

        if (peso_porcentaje <= 0 || peso_porcentaje > 1) {
            return res.status(400).json({ message: 'Validación fallida: El peso debe estar entre 0.001 y 1.0' });
        }

        const resultado = await preguntaService.modificarPregunta(id, { texto_pregunta, tipo_categoria, peso_porcentaje, activo, opciones });
        return res.status(200).json(resultado);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

module.exports = {
    obtenerPreguntasAdmin,
    guardarPregunta,
    actualizarPreguntaAdmin
};