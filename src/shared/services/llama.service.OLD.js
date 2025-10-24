const axios = require('axios');

class LlamaService {
  constructor() {
    this.baseURL = process.env.LLAMA_BASE_URL || 'http://localhost:11434';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 80000, // 60 segundos
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true' // Para ngrok free plan
      }
    });
  }

  // 🏥 Verificar conexión con Llama
  async checkConnection() {
    try {
      const response = await this.client.get('/v1/models');
      return {
        connected: true,
        models: response.data
      };
    } catch (error) {
      console.error('❌ Error conectando con Llama:', error.message);
      return {
        connected: false,
        error: error.message
      };
    }
  }

  // 💬 Chat completion genérico
  async chatCompletion(messages, options = {}) {
  try {
    // Si no se especifica modelo, usar el primero disponible
    let modelToUse = options.model;
    
    if (!modelToUse) {
      const modelsResponse = await this.checkConnection();
      if (modelsResponse.connected && modelsResponse.models?.data?.length > 0) {
        modelToUse = modelsResponse.models.data[0].id;
      } else {
        modelToUse = 'meta-llama-3.1-8b-instruct'; // fallback
      }
    }

    const payload = {
      model: modelToUse,
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1000,
      stream: false,
      ...options
    };

    const response = await this.client.post('/v1/chat/completions', payload);
    
    return {
      success: true,
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model: response.data.model
    };
  } catch (error) {
    console.error('❌ Error en chat completion:', error.message);
    return {
      success: false,
      error: error.message,
      details: error.response?.data || null
    };
  }
}

  // 📄 RF-102: Analizar contenido de CV
async analizarCV(contenidoTexto, nombreAlumno = '') {
  const prompt = `Analiza este CV y responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin explicaciones):

{
  "fortalezas": ["fortaleza1", "fortaleza2"],
  "habilidades_tecnicas": ["habilidad1", "habilidad2"],
  "habilidades_blandas": ["habilidad1", "habilidad2"],
  "areas_mejora": ["area1", "area2"],
  "experiencia_resumen": "resumen breve",
  "educacion_resumen": "resumen breve"
}

CV a analizar:
${contenidoTexto.substring(0, 1500)}`;

  const messages = [
    {
      role: 'system',
      content: 'Eres un analista de recursos humanos. Responde ÚNICAMENTE con JSON válido, sin markdown ni explicaciones adicionales.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  try {
    const response = await this.chatCompletion(messages, {
      temperature: 0.2, // Más determinista
      max_tokens: 600
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    // Limpiar la respuesta de markdown y caracteres extraños
    let cleanContent = response.content
      .replace(/```json\s*/, '')  // Remover ```json al inicio
      .replace(/```\s*$/, '')     // Remover ``` al final
      .replace(/^\s*["']{3}\s*/, '') // Remover """ al inicio
      .replace(/\s*["']{3}\s*$/, '') // Remover """ al final
      .trim();

    // Buscar el JSON dentro del contenido
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanContent = jsonMatch[0];
    }

    console.log('Respuesta limpia de IA:', cleanContent);

    const analisis = JSON.parse(cleanContent);
    
    return {
      success: true,
      analisis: analisis,
      contenido_extraido: response.content
    };
  } catch (error) {
    console.error('Error analizando CV:', error);
    console.error('Contenido recibido:', response?.content);
    
    // Fallback con estructura básica
    return {
      success: false,
      error: error.message,
      fallback_content: contenidoTexto.substring(0, 500) + '...'
    };
  }
}

  // 🎯 RF-105: Evaluar respuesta de entrevista
async evaluarRespuestaEntrevista(pregunta, respuesta, contexto = '') {
  const prompt = `Evalúa esta respuesta de entrevista y responde ÚNICAMENTE con JSON válido:

{
  "puntuacion": 8,
  "retroalimentacion": "feedback específico",
  "fortalezas": ["fortaleza1", "fortaleza2"],
  "areas_mejora": ["mejora1", "mejora2"],
  "sugerencias": ["sugerencia1", "sugerencia2"]
}

Pregunta: ${pregunta}
Respuesta: ${respuesta}`;

  const messages = [
    {
      role: 'system',
      content: 'Eres un entrevistador de RRHH. Responde ÚNICAMENTE con JSON válido, sin markdown.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  try {
    const response = await this.chatCompletion(messages, {
      temperature: 0.3,
      max_tokens: 400
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    // Misma limpieza que arriba
    let cleanContent = response.content
      .replace(/```json\s*/, '')
      .replace(/```\s*$/, '')
      .replace(/^\s*["']{3}\s*/, '')
      .replace(/\s*["']{3}\s*$/, '')
      .trim();

    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanContent = jsonMatch[0];
    }

    const evaluacion = JSON.parse(cleanContent);
    
    return {
      success: true,
      evaluacion: evaluacion
    };
  } catch (error) {
    console.error('Error evaluando respuesta:', error);
    return {
      success: false,
      error: error.message,
      fallback: {
        puntuacion: 7,
        retroalimentacion: 'Respuesta registrada. Evaluación pendiente.',
        fortalezas: ['Participación activa'],
        areas_mejora: ['Evaluación pendiente'],
        sugerencias: ['Continúa practicando']
      }
    };
  }
}

  // 🤖 RF-104: Generar pregunta de seguimiento inteligente
  async generarPreguntaSeguimiento(preguntaAnterior, respuestaAnterior, tipoEntrevista = 'general') {
    const prompt = `
Eres un entrevistador experto. Basándote en la interacción anterior, genera una pregunta de seguimiento inteligente.

**Pregunta anterior:** ${preguntaAnterior}
**Respuesta del candidato:** ${respuestaAnterior}
**Tipo de entrevista:** ${tipoEntrevista}

Genera una pregunta de seguimiento que:
1. Sea relevante a la respuesta dada
2. Profundice en aspectos importantes
3. Evalúe habilidades específicas
4. Sea apropiada para el contexto laboral

Responde ÚNICAMENTE con la pregunta, sin texto adicional.`;

    const messages = [
      {
        role: 'system',
        content: 'Eres un entrevistador profesional experto en hacer preguntas de seguimiento inteligentes y relevantes.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const response = await this.chatCompletion(messages, {
        temperature: 0.6,
        max_tokens: 200
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      return {
        success: true,
        pregunta: response.content.trim()
      };
    } catch (error) {
      console.error('❌ Error generando pregunta:', error);
      return {
        success: false,
        error: error.message,
        fallback: '¿Podrías darme un ejemplo específico de esa situación?'
      };
    }
  }

  // 📊 Generar resumen de informe
  async generarResumenInforme(datosCV, analisisIA) {
    const prompt = `
Genera un resumen ejecutivo profesional basado en el análisis del CV.

**Datos del CV:** ${JSON.stringify(datosCV, null, 2)}
**Análisis realizado:** ${JSON.stringify(analisisIA, null, 2)}

Crea un resumen ejecutivo de 2-3 párrafos que incluya:
1. Perfil profesional general
2. Principales fortalezas y competencias
3. Recomendaciones de desarrollo

El tono debe ser profesional y constructivo.`;

    const messages = [
      {
        role: 'system',
        content: 'Eres un consultor de recursos humanos experto en redactar informes profesionales de análisis de talento.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const response = await this.chatCompletion(messages, {
        temperature: 0.5,
        max_tokens: 800
      });

      return {
        success: true,
        resumen: response.success ? response.content : 'Resumen pendiente de generación'
      };
    } catch (error) {
      console.error('❌ Error generando resumen:', error);
      return {
        success: false,
        error: error.message,
        fallback: 'Informe de análisis de CV generado automáticamente.'
      };
    }
  }

  // 🔄 Test de conectividad
  async testConnection() {
    console.log('🧪 Probando conexión con Llama 3.1...');
    
    const testMessage = [
      {
        role: 'user',
        content: 'Responde con "OK" si puedes leerme correctamente.'
      }
    ];

    const result = await this.chatCompletion(testMessage, {
      max_tokens: 50,
      temperature: 0.1
    });

    if (result.success) {
      console.log('✅ Conexión con Llama exitosa:', result.content);
    } else {
      console.log('❌ Error de conexión:', result.error);
    }

    return result;
  }
}

// Singleton instance
const llamaService = new LlamaService();

module.exports = llamaService;