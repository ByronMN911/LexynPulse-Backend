const { GoogleGenAI } = require('@google/genai');
require('dotenv').config(); 

if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR CRÍTICO DE ENTORNO: La variable GEMINI_API_KEY no se pudo leer desde el archivo .env');
} else {
    const keyPrefix = process.env.GEMINI_API_KEY.substring(0, 6);
    console.log(`[Seguridad IA] API Key inyectada exitosamente desde el .env. Prefijo activo: ${keyPrefix}...`);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generarInformeOrientacion = async (empresaNombre, sector, tamano, riesgos) => {
    
    /*
     * PROMPT CON ESTÁNDAR ARQUITECTÓNICO DETERMINISTA:
     * Restringe semánticamente el output del modelo para sincronizarlo con el parser de Angular 21.
     * Fuerza quiebres de párrafos dobles (\n\n) y prohíbe asteriscos simples de itálicas (*).
     */
    const prompt = `
Actúa como un Auditor Senior Experto en Ciberseguridad y en la Ley Orgánica de Protección de Datos Personales (LODPD) de Ecuador.
Has procesado un diagnóstico automatizado para la empresa "${empresaNombre}", del sector "${sector}" y tamaño "${tamano}".

El sistema detectó contractualmente estas 3 brechas de cumplimiento prioritarias (escala 0-10, donde 10 es peligro crítico):
${riesgos.map((r, i) => `${i + 1}. CATEGORÍA: ${r.tipo_categoria}\n   EVALUACIÓN: ${r.texto_pregunta}\n   SITUACIÓN ACTUAL: ${r.texto_opcion}\n   AMENAZA: ${r.puntaje_riesgo_momento}/10`).join('\n\n')}

Genera un "Informe de Orientación Ejecutiva" con tono persuasivo y corporativo para la Alta Gerencia. El reporte debe seguir estrictamente esta estructura de tokens en Markdown:

### Diagnóstico de Vulnerabilidades Críticas
(Escribe un texto fluido. OBLIGATORIO: Redacta exactamente dos párrafos separados por un salto de línea doble. Cada párrafo debe tener máximo 3 oraciones. Explica el peligro sistémico legal y reputacional).

### Plan de Mitigación Inmediato
(Escribe un listado numerado para las 3 vulnerabilidades en orden. El formato de cada ítem debe ser exactamente el siguiente, usando dos asteriscos para negritas y saltos de línea simples:
1. **Tratamiento de Datos Sensibles sin Control (Puntuación 10/10):**
* **Acción Inmediata:** [Texto de la acción accionable y de bajo costo]
* **Costo Operativo Bajo:** [Texto de justificación financiera])

### Conclusión y Próximos Pasos
(Escribe exactamente dos párrafos ejecutivos separados por un salto de línea doble. Concientiza sobre la urgencia de adoptar la solución tecnológica recomendada).

REGLAS CRÍTICAS DE ENTORNO FORMATIVO:
1. Prohibido usar introducciones, saludos o textos de relleno. Inicia directo con el primer '###'.
2. Prohibido usar asteriscos simples para itálicas o énfasis como *todos*. Si deseas enfatizar algo, usa únicamente letras normales o negritas con dos asteriscos '**'.
3. Respeta minuciosamente las separaciones de párrafos mediante saltos de línea dobles.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error('Error crítico detallado al invocar la API de Gemini:', error);
        return '### Diagnóstico de Vulnerabilidades Críticas\nEl informe de orientación ejecutiva no pudo ser generado debido a una interrupción temporal en los servidores de la API de Inteligencia Artificial. Por favor, guarde su registro e intente recargar el reporte desde su historial más tarde.';
    }
};

module.exports = {
    generarInformeOrientacion
};