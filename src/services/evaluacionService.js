const crypto = require('crypto');
const db = require('../config/db');
const evaluacionModel = require('../models/evaluacionModel');
const geminiService = require('./geminiService');


// Precios base por tamaño de empresa — punto de partida antes de multiplicadores
const TARIFAS_BASE = {
    'Micro (1-10)':       { pulse: 149, sentinel: 990,  care: 79  },
    'Pequeña (11-50)':    { pulse: 299, sentinel: 1990, care: 149 },
    'Mediana (51-200)':   { pulse: 599, sentinel: 3990, care: 299 },
    'Grande (201+)':      { pulse: 999, sentinel: 6990, care: 499 }
};

// Incremento de precio según nivel de peligrosidad detectado
const MULTIPLICADORES_RIESGO = {
    'Bajo': 1.00, 'Medio': 1.15, 'Alto': 1.35, 'Crítico': 1.60
};

// Ajuste adicional según industria; Salud tiene mayor recargo por datos sensibles
const MULTIPLICADORES_SECTOR = {
    'General / Otros': 1.00, 'E-commerce': 1.00, 'Educación': 1.10, 'Salud': 1.25
};

// Transforma filas planas de BD en objetos anidados con sus opciones agrupadas
const estructurarCuestionario = async () => {

    // ==========================================================================
    // 1. CANDADO DE SEGURIDAD: VERIFICACIÓN DE CALIBRACIÓN 
    // ==========================================================================
    const validacionPesos = await db.query(`SELECT COALESCE(SUM(peso_porcentaje), 0) AS total_peso FROM preguntas WHERE activo = TRUE`);
    const sumaTotal = parseFloat(validacionPesos.rows[0].total_peso);
    
    if (sumaTotal !== 1) {
        // Al lanzar este error, el controlador lo atrapa y Angular lo muestra en su tarjeta de contingencia.
        throw new Error('El cuestionario se encuentra en mantenimiento técnico. Intente más tarde.');
    }
    // ==========================================================================

    const filas = await evaluacionModel.obtenerCuestionarioCompleto();
    const preguntasMap = {};

    filas.forEach(fila => {
        // Crea la pregunta solo la primera vez que aparece su ID
        if (!preguntasMap[fila.pregunta_id]) {
            preguntasMap[fila.pregunta_id] = {
                id: fila.pregunta_id,
                texto_pregunta: fila.texto_pregunta,
                tipo_categoria: fila.tipo_categoria,
                peso_porcentaje: parseFloat(fila.peso_porcentaje), // String → float para operar matemáticamente
                opciones: []
            };
        }
        // Cada fila adicional de la misma pregunta es una opción nueva
        preguntasMap[fila.pregunta_id].opciones.push({
            id: fila.opcion_id,
            literal: fila.literal,
            texto_opcion: fila.texto_opcion,
            puntaje_riesgo: parseFloat(fila.puntaje_riesgo)
        });
    });

    return Object.values(preguntasMap); // Convierte el mapa a array para iterar en el frontend
};

const calcularYGuardarEvaluacion = async (usuarioId, respuestasUsuario) => {


    // ==========================================================================
    // 1. CANDADO DE SEGURIDAD: VERIFICACIÓN DE CALIBRACIÓN 
    // ==========================================================================
    const validacionPesos = await db.query(`SELECT COALESCE(SUM(peso_porcentaje), 0) AS total_peso FROM preguntas WHERE activo = TRUE`);
    const sumaTotal = parseFloat(validacionPesos.rows[0].total_peso);
    
    if (sumaTotal !== 1) {
        // Al lanzar este error, el controlador lo atrapa y Angular lo muestra en su tarjeta de contingencia.
        throw new Error('El cuestionario se encuentra en mantenimiento técnico. Intente más tarde.');
    }
    // ==========================================================================


    // Se necesita tamano y sector para pricing; nombre para el prompt de IA
    const queryUsuario = 'SELECT nombre_completo, empresa_nombre, empresa_tamano, empresa_sector FROM usuarios WHERE id = $1';
    const resUser = await db.query(queryUsuario, [usuarioId]);
    const usuario = resUser.rows[0];

    // Falla rápido si faltan datos de segmentación — no tiene sentido continuar
    if (!usuario || !usuario.empresa_tamano || !usuario.empresa_sector) {
        throw new Error('El perfil del cliente no cuenta con datos de segmentación válidos.');
    }

    const tamano = usuario.empresa_tamano;
    const sector = usuario.empresa_sector;
    const nombreEmpresa = usuario.empresa_nombre || usuario.nombre_completo; // Fallback al nombre personal si no hay nombre de empresa

    const cuestionarioEstructurado = await estructurarCuestionario();
    let scoreBasePonderado = 0;
    const detallesAGuardar = [];

    // Se itera el catálogo (no las respuestas) para detectar preguntas sin responder
    cuestionarioEstructurado.forEach(preg => {
        const respuestaCliente = respuestasUsuario.find(r => r.pregunta_id === preg.id);
        if (!respuestaCliente) {
            throw new Error(`Falta responder la pregunta obligatoria ID: ${preg.id}`);
        }

        const opcionSeleccionada = preg.opciones.find(o => o.id === respuestaCliente.opcion_id);
        if (!opcionSeleccionada) {
            throw new Error(`La opción seleccionada para la pregunta ${preg.id} no existe.`);
        }

        // Suma ponderada: puntaje × peso de la pregunta
        scoreBasePonderado += opcionSeleccionada.puntaje_riesgo * preg.peso_porcentaje;

        detallesAGuardar.push({
            pregunta_id: preg.id,
            texto_pregunta: preg.texto_pregunta,   // Se incluye para construir el prompt de Gemini
            texto_opcion: opcionSeleccionada.texto_opcion,
            tipo_categoria: preg.tipo_categoria,
            opcion_elegida_id: opcionSeleccionada.id,
            peso_porcentaje_momento: preg.peso_porcentaje,
            puntaje_riesgo_momento: opcionSeleccionada.puntaje_riesgo
        });
    });

    // Escala el resultado de base 10 a base 100 para legibilidad
    scoreBasePonderado = scoreBasePonderado * 10;
    const multiplicadorContexto = 1.00; // Reservado para ajustes futuros de contexto
    let scoreFinal = Math.min(scoreBasePonderado * multiplicadorContexto, 100.00); // Techo en 100

    // Clasificación por bandas; el valor por defecto es el nivel más bajo
    let nivelRiesgo = 'Bajo';
    let productoRecomendado = 'Care';

    if (scoreFinal > 20 && scoreFinal <= 40) {
        nivelRiesgo = 'Medio';
        productoRecomendado = 'Pulse + Care';
    } else if (scoreFinal > 40 && scoreFinal <= 70) {
        nivelRiesgo = 'Alto';
        productoRecomendado = 'Sentinel';
    } else if (scoreFinal > 70) {
        nivelRiesgo = 'Crítico';
        productoRecomendado = 'Sentinel urgente + Care';
    }

    // Lookup de tarifas base con fallback a 0 si el tamaño no está mapeado
    const basePulse    = TARIFAS_BASE[tamano]?.pulse    || 0;
    const baseSentinel = TARIFAS_BASE[tamano]?.sentinel || 0;
    const baseCare     = TARIFAS_BASE[tamano]?.care     || 0;

    const multRiesgo = MULTIPLICADORES_RIESGO[nivelRiesgo];
    const multSector = MULTIPLICADORES_SECTOR[sector] || 1.00;

    // Precio final = tarifa base × riesgo × sector; Care es tarifa plana sin ajustes
    const precioPulseCalculado    = Math.round(basePulse    * multRiesgo * multSector);
    const precioSentinelCalculado = Math.round(baseSentinel * multRiesgo * multSector);
    const precioCareCalculado     = baseCare;

    const descuentoSugerido      = 0.10;
    const precioPulseConImpuesto = precioPulseCalculado; // Impuesto en 0% por ahora

    // Recargo de urgencia del 10% exclusivo para nivel Crítico
    let precioSentinelConUrgencia = precioSentinelCalculado;
    if (nivelRiesgo === 'Crítico') {
        precioSentinelConUrgencia = Math.round(precioSentinelCalculado * 1.10);
    }

    // Top 3 preguntas con mayor puntaje de riesgo — se pasan como contexto a la IA
    const top3Riesgos = [...detallesAGuardar]
        .sort((a, b) => b.puntaje_riesgo_momento - a.puntaje_riesgo_momento)
        .slice(0, 3);

    // Llama a Gemini con el perfil de empresa y las 3 brechas más críticas
    const informeIA = await geminiService.generarInformeOrientacion(
        nombreEmpresa, sector, tamano, top3Riesgos
    );

    // Generamos un hash único combinando un prefijo, un string aleatorio y la fecha
    const codigoGenerado = 'LXP-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + Date.now().toString().slice(-6);

    const cabeceraEvaluacion = {
        usuario_id: usuarioId,
        empresa_tamano_momento: tamano,
        empresa_sector_momento: sector,
        score_base: scoreBasePonderado,
        multiplicador_contexto: multiplicadorContexto,
        score_final: scoreFinal,
        nivel_riesgo: nivelRiesgo,
        producto_recomendado: productoRecomendado,
        precio_pulse: precioPulseCalculado,
        precio_sentinel: precioSentinelCalculado,
        precio_care_mensual: precioCareCalculado,
        descuento_sugerido_momento: descuentoSugerido,
        precio_pulse_con_impuesto: precioPulseConImpuesto,
        precio_sentinel_con_urgencia_impuesto: precioSentinelConUrgencia,
        analisis_orientacion_ia: informeIA,
        codigo_verificacion: codigoGenerado
    };

    // Transacción atómica: si falla cualquier inserción, se revierten todos los cambios
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const cabeceraInsertada = await evaluacionModel.insertarCabecera(client, cabeceraEvaluacion);

        for (const detalle of detallesAGuardar) {
            detalle.evaluacion_id = cabeceraInsertada.id; // Enlaza cada detalle a su cabecera
            await evaluacionModel.insertarDetalle(client, detalle);
        }

        await client.query('COMMIT');
        return cabeceraInsertada;
    } catch (error) {
        await client.query('ROLLBACK'); // Deshace todo si algo falla
        throw error;
    } finally {
        client.release(); // Siempre libera la conexión al pool, haya error o no
    }
};

// Retorna el historial resumido de evaluaciones del usuario
const obtenerHistorialCliente = async (usuarioId) => {
    return await evaluacionModel.obtenerHistorialPorUsuario(usuarioId);
};

// Ensambla el reporte completo: cabecera + todas las respuestas + top 3 riesgos
const obtenerReporteDetallado = async (evaluacionId) => {
    const cabecera = await evaluacionModel.obtenerEvaluacionPorId(evaluacionId);
    if (!cabecera) {
        throw new Error('El reporte de diagnóstico solicitado no existe.');
    }

    const respuestas = await evaluacionModel.obtenerDetallesPorEvaluacionId(evaluacionId);

    // Se recalcula en tiempo real para no depender de un campo almacenado
    const top3Riesgos = [...respuestas]
        .sort((a, b) => b.puntaje - a.puntaje)
        .slice(0, 3);

    return { cabecera, top3Riesgos, respuestas };
};

/*
 * Extrae la telemetría global de evaluaciones con el desglose técnico y financiero completo para uso del Admin.
 */
const obtenerTelemetriaGlobalAdmin = async () => {
    return await evaluacionModel.obtenerTodasEvaluacionesDashboard();
};

/*
 * Servicio para verificar la autenticidad de un reporte PDF.
 */
const validarReporteCriptografico = async (codigo) => {
    return await evaluacionModel.verificarCodigoSeguridad(codigo);
};

module.exports = {
    estructurarCuestionario,
    calcularYGuardarEvaluacion,
    obtenerHistorialCliente,
    obtenerReporteDetallado,
    obtenerTelemetriaGlobalAdmin,
    validarReporteCriptografico
};