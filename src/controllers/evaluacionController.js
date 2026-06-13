const evaluacionService = require('../services/evaluacionService');

/*
 * Procesa la solicitud HTTP de obtención del cuestionario dinámico.
 */
const obtenerCuestionario = async (req, res) => {
    try {
        const cuestionario = await evaluacionService.estructurarCuestionario();
        return res.status(200).json(cuestionario);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

/*
 * Procesa la solicitud HTTP de guardado, cálculo e integración con la IA.
 */
const procesarEvaluacion = async (req, res) => {
    try {
        
        const usuarioId = req.user.id; 
        const { respuestas } = req.body;

        if (!respuestas || !Array.isArray(respuestas)) {
            return res.status(400).json({ message: 'El formato de las respuestas es inválido.' });
        }

        // Validación inicial: Previene que la carga útil sea basura o un arreglo vacío
        if (!respuestas || !Array.isArray(respuestas) || respuestas.length === 0) {
            return res.status(400).json({ message: 'Hackeo detectado: El formato de las respuestas es inválido o está vacío.' });
        }

        const resultado = await evaluacionService.calcularYGuardarEvaluacion(usuarioId, respuestas);
        return res.status(201).json({
            message: 'Evaluación procesada y grabada con éxito histórico de IA.',
            resultado
        });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

/*
 * Intercepta la solicitud para listar el historial de un usuario determinado.
 */
const listarHistorial = async (req, res) => {
    try {
        const usuarioId = req.params.id;
        const historial = await evaluacionService.obtenerHistorialCliente(usuarioId);
        return res.status(200).json(historial);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

/*
 * Intercepta la solicitud para extraer el JSON final y detallado de un reporte individual.
 */
const obtenerReporte = async (req, res) => {
    try {
        const evaluacionId = req.params.id;
        const reporte = await evaluacionService.obtenerReporteDetallado(evaluacionId);
        return res.status(200).json(reporte);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

/*
 * Intercepta la petición del Administrador para obtener el panel maestro de telemetría relacional.
 */
const obtenerDashboardGlobal = async (req, res) => {
    try {
        const evaluacionesAll = await evaluacionService.obtenerTelemetriaGlobalAdmin();
        return res.status(200).json(evaluacionesAll);
    } catch (error) {
        return res.status(500).json({ message: 'Error interno al procesar el dashboard global.' });
    }
};

/*
 * Endpoint público para la validación de reportes PDF.
 * Permite a auditores externos verificar la integridad del documento.
 */
const verificarReporte = async (req, res) => {
    try {
        const { codigo } = req.params;
        
        // El controlador llama al servicio, ¡jamás a la base de datos!
        const documentoValido = await evaluacionService.validarReporteCriptografico(codigo);

        if (!documentoValido) {
            return res.status(404).json({ 
                valido: false, 
                mensaje: 'Código de verificación inválido o documento alterado.' 
            });
        }

        return res.status(200).json({
            valido: true,
            mensaje: 'Documento original y verificado por Lexyn Pulse.',
            datos: documentoValido
        });

    } catch (error) {
        console.error('Error crítico al verificar documento:', error);
        return res.status(500).json({ message: 'Error interno del servidor al verificar código.' });
    }
};


module.exports = {
    obtenerCuestionario,
    procesarEvaluacion,
    listarHistorial,
    obtenerReporte,
    obtenerDashboardGlobal,
    verificarReporte 
};