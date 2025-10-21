const llamaService = require('./llama.service');
const logger = require('./logger.service');

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
- Adaptas tus preguntas según las respuestas previas del candidato
- Das retroalimentación constructiva cuando es apropiado
- VARÍA tus preguntas basándote en el flujo natural de la conversación

**NIVEL DE DIFICULTAD:** ${dificultad} - ${dificultadTexto[dificultad]}

**COMPETENCIAS CLAVE A EVALUAR:**
${carrera.competencias_clave ? carrera.competencias_clave.map(c => `- ${c}`).join('\n') : '- Competencias técnicas generales\n- Habilidades blandas\n- Adaptabilidad'}

**ESTRUCTURA FLEXIBLE DE LA ENTREVISTA:**
1. Saludo profesional y presentación breve
2. Preguntas sobre experiencia y motivación (VARÍA según lo que mencione el candidato)
3. Preguntas técnicas específicas de ${carrera.area} (profundiza según respuestas previas)
4. Preguntas situacionales/conductuales (basadas en temas que surgieron)
5. Cierre y espacio para preguntas del candidato

**IMPORTANTE - VARIACIÓN DE PREGUNTAS:**
- NO repitas preguntas similares que ya hiciste
- Analiza el historial completo antes de hacer una nueva pregunta
- Si el candidato mencionó algo interesante, profundiza en ESO
- Cada pregunta debe seguir naturalmente de la respuesta anterior
- Si ya cubriste un tema, pasa a otro diferente
- Usa diferentes ángulos: "¿Cómo...?", "¿Por qué...?", "Cuéntame sobre...", "Dame un ejemplo de..."

**EVITA LA REPETICIÓN:**
- Antes de preguntar, revisa si ya hiciste una pregunta similar
- No uses las mismas frases de apertura repetidamente
- Varía el enfoque: técnico → conductual → situacional → motivacional
- Si el candidato ya habló de experiencia, pregunta sobre desafíos, aprendizajes, o proyectos futuros

**FORMATO DE RESPUESTA:**
- Responde de manera natural y conversacional
- Usa párrafos cortos para facilitar la lectura
- No uses formato JSON a menos que se solicite específicamente
- Menciona algo específico de la respuesta anterior del candidato para mostrar que escuchaste`;
  }

  // 💬 Iniciar conversación de entrevista - CON LLAMA 3.1 8B REAL
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

      logger.info('🤖 INICIANDO LLAMADA A LLAMA 3.1 8B', {
        carrera: carrera.nombre,
        dificultad,
        candidato: nombreCandidato,
        model: 'meta-llama-3.1-8b-instruct'
      });

      const response = await llamaService.chatCompletion(messages, {
        model: 'meta-llama-3.1-8b-instruct', // EXPLÍCITAMENTE especificar modelo
        temperature: 0.9,
        max_tokens: 400,
        top_p: 0.95,
        frequency_penalty: 0.6,
        presence_penalty: 0.6
      });

      if (!response.success) {
        logger.error('❌ LLAMA FALLÓ - Usando fallback', { error: response.error });
        throw new Error(response.error);
      }

      logger.success('✅ RESPUESTA DE LLAMA 3.1 8B RECIBIDA', {
        model_usado: response.model,
        tokens_usados: response.usage,
        longitud_respuesta: response.content?.length
      });

      // 🔧 CORRECCIÓN: Solo guardar el mensaje inicial del asistente
      // NO guardar el mensaje del sistema en el historial
      return {
        success: true,
        mensaje: response.content,
        model_usado: response.model, // Indicar qué modelo se usó
        historial: [
          {
            role: 'assistant',
            content: response.content,
            timestamp: new Date().toISOString()
          }
        ]
      };

    } catch (error) {
      logger.error('❌ ERROR CRÍTICO - FALLBACK ACTIVADO', error);

      // Fallback sin IA
      const mensajeFallback = `Hola ${nombreCandidato}, ¡bienvenido! Soy tu entrevistador virtual para la posición en ${carrera.nombre}. Comencemos con una pregunta: ¿Qué te motivó a postular para esta posición?`;

      return {
        success: false,
        error: error.message,
        mensaje: mensajeFallback,
        usando_fallback: true, // Flag para identificar cuando NO se usa IA
        historial: [
          {
            role: 'assistant',
            content: mensajeFallback,
            timestamp: new Date().toISOString()
          }
        ]
      };
    }
  }

  // 💬 Continuar conversación de entrevista - CON LLAMA 3.1 8B REAL
  async continuarEntrevista(historialCompleto, mensajeUsuario, carrera, dificultad) {
    try {
      const systemPrompt = this.getSystemPrompt(carrera, dificultad);

      // 🔧 CORRECCIÓN: Construir mensajes para la IA incluyendo system al inicio
      // pero NO guardarlo en el historial de la BD
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        // Agregar solo los mensajes usuario/asistente del historial
        ...historialCompleto
          .filter(msg => msg.role === 'user' || msg.role === 'assistant')
          .map(msg => ({
            role: msg.role,
            content: msg.content
          }))
      ];

      logger.info('🤖 CONTINUANDO CON LLAMA 3.1 8B', {
        total_mensajes_historial: messages.length - 1, // -1 por el system
        mensajes_usuario: messages.filter(m => m.role === 'user').length,
        mensajes_asistente: messages.filter(m => m.role === 'assistant').length
      });

      const response = await llamaService.chatCompletion(messages, {
        model: 'meta-llama-3.1-8b-instruct', // EXPLÍCITAMENTE especificar modelo
        temperature: 0.9, // Mayor variación en las respuestas
        max_tokens: 400,
        top_p: 0.95, // Más diversidad en la selección de tokens
        frequency_penalty: 0.6, // Penaliza repeticiones
        presence_penalty: 0.6 // Fomenta temas nuevos
      });

      if (!response.success) {
        logger.error('❌ LLAMA FALLÓ EN CONTINUAR - Usando fallback', { error: response.error });
        throw new Error(response.error);
      }

      logger.success('✅ RESPUESTA CONTINUA DE LLAMA 3.1 8B', {
        model_usado: response.model,
        tokens_usados: response.usage,
        longitud_respuesta: response.content?.length
      });

      return {
        success: true,
        mensaje: response.content,
        model_usado: response.model
      };

    } catch (error) {
      logger.error('❌ ERROR EN CONTINUAR - FALLBACK ACTIVADO', error);

      // Fallback sin IA
      const respuestasFallback = [
        'Gracias por tu respuesta. ¿Podrías contarme más sobre tu experiencia en este campo?',
        'Interesante. ¿Cómo manejas los desafíos técnicos en tu trabajo diario?',
        'Entiendo. ¿Puedes darme un ejemplo específico de un proyecto exitoso que hayas liderado?',
        '¿Cómo describirías tu estilo de trabajo en equipo?',
        'Cuéntame sobre una situación difícil que hayas enfrentado profesionalmente y cómo la resolviste.'
      ];

      const respuestaRandom = respuestasFallback[Math.floor(Math.random() * respuestasFallback.length)];

      return {
        success: false,
        error: error.message,
        mensaje: respuestaRandom,
        usando_fallback: true
      };
    }
  }

  // 📊 Generar evaluación final - SIN CAMBIOS (ya estaba bien)
  async generarEvaluacionFinal(historialCompleto, carrera, dificultad) {
    try {
      // Filtrar solo mensajes relevantes (sin system)
      const historialLimpio = historialCompleto.filter(m => m.role !== 'system');
      
      const promptEvaluacion = `Como reclutador profesional, analiza esta entrevista completa y genera una evaluación detallada en formato JSON.

**CARRERA:** ${carrera.nombre}
**DIFICULTAD:** ${dificultad}

**HISTORIAL DE LA ENTREVISTA:**
${historialLimpio.map((msg, i) => `${i + 1}. ${msg.role === 'assistant' ? 'ENTREVISTADOR' : 'CANDIDATO'}: ${msg.content}`).join('\n\n')}

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
      const mensajesUsuario = historialCompleto.filter(m => m.role === 'user').length;
      let puntuacionBase = 5.5;
      
      if (mensajesUsuario >= 10) puntuacionBase = 8.0;
      else if (mensajesUsuario >= 7) puntuacionBase = 7.5;
      else if (mensajesUsuario >= 5) puntuacionBase = 7.0;
      else if (mensajesUsuario >= 3) puntuacionBase = 6.5;
      else if (mensajesUsuario >= 2) puntuacionBase = 6.0;
      
      return {
        success: false,
        error: error.message,
        evaluacion: {
          puntuacion_global: puntuacionBase,
          nivel_desempenio: puntuacionBase >= 7.5 ? "Muy Bueno" : puntuacionBase >= 6.5 ? "Bueno" : "Regular",
          fortalezas: [
            "Completó la entrevista",
            `Participó activamente con ${mensajesUsuario} respuestas`
          ],
          areas_mejora: [
            "Profundizar en respuestas técnicas",
            "Proporcionar más ejemplos específicos"
          ],
          evaluacion_detallada: {
            comunicacion: puntuacionBase,
            conocimiento_tecnico: puntuacionBase,
            experiencia_relevante: puntuacionBase,
            actitud_profesional: puntuacionBase,
            adaptabilidad: puntuacionBase
          },
          recomendacion_contratacion: "Requiere evaluación adicional con entrevista presencial",
          comentario_final: `El candidato completó la entrevista con ${mensajesUsuario} respuestas. Se recomienda una evaluación más profunda en entrevista presencial.`,
          proximos_pasos_sugeridos: [
            "Practicar respuestas más detalladas",
            "Preparar ejemplos concretos con métricas",
            "Considerar segunda entrevista técnica"
          ]
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