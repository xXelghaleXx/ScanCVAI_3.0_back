const llamaService = require('./LlamaService');
const logger = require('./LoggerService');

class InterviewAIService {

  // 🎯 Generar contexto del sistema según carrera y dificultad
  getSystemPrompt(carrera, dificultad) {
    const dificultadTexto = {
      'basica': 'nivel básico, enfocándote en preguntas fundamentales y motivacionales',
      'intermedia': 'nivel intermedio, con preguntas técnicas moderadas y situacionales',
      'avanzada': 'nivel avanzado, con preguntas técnicas profundas, casos complejos y evaluación de liderazgo'
    };

    return `Eres un reclutador profesional de recursos humanos especializado en la carrera de ${carrera.nombre}.

**TU ROL:**
- Eres amigable pero profesional
- Haces UNA pregunta a la vez y esperas la respuesta del candidato
- Evalúas las respuestas del candidato considerando el contexto de ${carrera.nombre}
- Adaptas tus preguntas según las respuestas previas
- Das retroalimentación constructiva cuando es apropiado

**NIVEL DE DIFICULTAD:** ${dificultad} - ${dificultadTexto[dificultad]}

**COMPETENCIAS CLAVE A EVALUAR:**
${carrera.competencias_clave ? carrera.competencias_clave.map(c => `- ${c}`).join('\n') : '- Competencias técnicas generales\n- Habilidades blandas\n- Adaptabilidad'}

**ESTRUCTURA DE LA ENTREVISTA:**
1. Saludo profesional y presentación breve
2. Preguntas sobre experiencia y motivación
3. Preguntas técnicas específicas de ${carrera.area}
4. Preguntas situacionales/conductuales
5. Cierre y espacio para preguntas del candidato

**IMPORTANTE:**
- NO hagas múltiples preguntas a la vez
- Escucha atentamente cada respuesta antes de continuar
- Adapta tus preguntas según lo que el candidato comparte
- Sé empático pero mantén el profesionalismo
- Al finalizar, proporciona una evaluación honesta y constructiva

**FORMATO DE RESPUESTA:**
- Responde de manera natural y conversacional
- Usa párrafos cortos para facilitar la lectura
- No uses formato JSON a menos que se solicite específicamente`;
  }

  // 💬 Iniciar conversación de entrevista
  async iniciarEntrevista(carrera, dificultad, nombreCandidato) {
    try {
      const systemPrompt = this.getSystemPrompt(carrera, dificultad);
      
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Hola, soy ${nombreCandidato}. Estoy listo para comenzar la entrevista.`
        }
      ];

      const response = await llamaService.chatCompletion(messages, {
        temperature: 0.7,
        max_tokens: 400
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      logger.info('Entrevista iniciada con IA', {
        carrera: carrera.nombre,
        dificultad,
        candidato: nombreCandidato
      });

      return {
        success: true,
        mensaje: response.content,
        historial: [
          {
            role: 'assistant',
            content: response.content,
            timestamp: new Date().toISOString()
          }
        ]
      };

    } catch (error) {
      logger.error('Error iniciando entrevista con IA', error);
      return {
        success: false,
        error: error.message,
        mensaje: `Hola ${nombreCandidato}, ¡bienvenido! Soy tu entrevistador virtual. Comencemos con una pregunta: ¿Qué te motivó a postular para esta posición en ${carrera.nombre}?`
      };
    }
  }

  // 💬 Continuar conversación de entrevista
  async continuarEntrevista(historialCompleto, mensajeUsuario, carrera, dificultad) {
    try {
      const systemPrompt = this.getSystemPrompt(carrera, dificultad);
      
      // Construir array de mensajes para el contexto
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...historialCompleto.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: mensajeUsuario
        }
      ];

      const response = await llamaService.chatCompletion(messages, {
        temperature: 0.7,
        max_tokens: 400
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      return {
        success: true,
        mensaje: response.content
      };

    } catch (error) {
      logger.error('Error continuando entrevista', error);
      return {
        success: false,
        error: error.message,
        mensaje: 'Gracias por tu respuesta. ¿Podrías contarme más sobre tu experiencia en este campo?'
      };
    }
  }

  // 📊 Generar evaluación final
  async generarEvaluacionFinal(historialCompleto, carrera, dificultad) {
    try {
      const promptEvaluacion = `Como reclutador profesional, analiza esta entrevista completa y genera una evaluación detallada en formato JSON.

**CARRERA:** ${carrera.nombre}
**DIFICULTAD:** ${dificultad}

**HISTORIAL DE LA ENTREVISTA:**
${historialCompleto.map((msg, i) => `${i + 1}. ${msg.role === 'assistant' ? 'ENTREVISTADOR' : 'CANDIDATO'}: ${msg.content}`).join('\n\n')}

**GENERA UN JSON CON ESTA ESTRUCTURA EXACTA:**
{
  "puntuacion_global": 8.5,
  "nivel_desempenio": "Muy Bueno",
  "fortalezas": [
    "Comunicación clara y estructurada",
    "Conocimiento técnico sólido en X",
    "Buenos ejemplos de experiencia"
  ],
  "areas_mejora": [
    "Profundizar en conocimientos de Y",
    "Trabajar en manejo de nerviosismo inicial"
  ],
  "evaluacion_detallada": {
    "comunicacion": 9,
    "conocimiento_tecnico": 8,
    "experiencia_relevante": 7,
    "actitud_profesional": 9,
    "adaptabilidad": 8
  },
  "recomendacion_contratacion": "Recomendado con reservas menores",
  "comentario_final": "El candidato demuestra... [comentario profesional]",
  "proximos_pasos_sugeridos": [
    "Considerar para segunda entrevista técnica",
    "Solicitar referencias laborales"
  ]
}

**IMPORTANTE:** Responde ÚNICAMENTE con el JSON válido, sin texto adicional.`;

      const messages = [
        {
          role: 'system',
          content: 'Eres un evaluador experto de entrevistas. Responde ÚNICAMENTE con JSON válido.'
        },
        {
          role: 'user',
          content: promptEvaluacion
        }
      ];

      const response = await llamaService.chatCompletion(messages, {
        temperature: 0.3,
        max_tokens: 1000
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      // Limpiar y parsear JSON
      let cleanContent = response.content
        .replace(/```json\s*/, '')
        .replace(/```\s*$/, '')
        .trim();

      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }

      const evaluacion = JSON.parse(cleanContent);

      logger.success('Evaluación final generada', {
        puntuacion: evaluacion.puntuacion_global,
        nivel: evaluacion.nivel_desempenio
      });

      return {
        success: true,
        evaluacion
      };

    } catch (error) {
      logger.error('Error generando evaluación final', error);
      
      // Evaluación fallback básica
      return {
        success: false,
        error: error.message,
        evaluacion: {
          puntuacion_global: 7.0,
          nivel_desempenio: "Bueno",
          fortalezas: ["Participación activa en la entrevista"],
          areas_mejora: ["Evaluación detallada pendiente"],
          evaluacion_detallada: {
            comunicacion: 7,
            conocimiento_tecnico: 7,
            experiencia_relevante: 7,
            actitud_profesional: 7,
            adaptabilidad: 7
          },
          recomendacion_contratacion: "Requiere evaluación adicional",
          comentario_final: "El candidato completó la entrevista. Se recomienda revisión manual de las respuestas.",
          proximos_pasos_sugeridos: ["Revisión manual del historial", "Considerar segunda entrevista"]
        }
      };
    }
  }

  // 🧠 Analizar respuesta individual (para feedback en tiempo real)
  async analizarRespuestaRapida(pregunta, respuesta) {
    try {
      const prompt = `Como entrevistador, analiza brevemente esta respuesta:

PREGUNTA: ${pregunta}
RESPUESTA: ${respuesta}

Proporciona un feedback corto (máximo 2 oraciones) sobre la calidad de la respuesta.`;

      const messages = [
        {
          role: 'system',
          content: 'Eres un entrevistador que da feedback constructivo y breve.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await llamaService.chatCompletion(messages, {
        temperature: 0.5,
        max_tokens: 150
      });

      return {
        success: response.success,
        feedback: response.content || 'Respuesta registrada.'
      };

    } catch (error) {
      logger.error('Error analizando respuesta rápida', error);
      return {
        success: false,
        feedback: 'Gracias por tu respuesta.'
      };
    }
  }

}

// Singleton instance
const interviewAIService = new InterviewAIService();

module.exports = interviewAIService;