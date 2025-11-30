const axios = require('axios');

class LlamaService {
  constructor() {
    // Soportar múltiples proveedores de IA
    this.provider = process.env.AI_PROVIDER || 'local'; // 'local', 'groq', 'openai'
    this.groqApiKey = process.env.GROQ_API_KEY || null;
    this.openaiApiKey = process.env.OPENAI_API_KEY || null;

    // Cliente para Llama local
    this.localBaseURL = process.env.LLAMA_BASE_URL || 'http://localhost:11434';
    this.localClient = axios.create({
      baseURL: this.localBaseURL,
      timeout: 180000, // 3 minutos para modelos lentos en Render
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Cliente para Groq
    this.groqClient = axios.create({
      baseURL: 'https://api.groq.com/openai/v1',
      timeout: 90000, // 90 segundos para Groq
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.groqApiKey}`
      }
    });

    // Cliente para OpenAI
    this.openaiClient = axios.create({
      baseURL: 'https://api.openai.com/v1',
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`
      }
    });
  }

  // 🏥 Verificar conexión
  async checkConnection() {
    try {
      // Intentar con el provider configurado
      if (this.provider === 'groq' && this.groqApiKey) {
        const response = await this.groqClient.get('/models');
        return {
          connected: true,
          provider: 'groq',
          models: response.data
        };
      } else if (this.provider === 'openai' && this.openaiApiKey) {
        const response = await this.openaiClient.get('/models');
        return {
          connected: true,
          provider: 'openai',
          models: response.data
        };
      } else {
        // Por defecto intentar con Llama local
        const response = await this.localClient.get('/v1/models');
        return {
          connected: true,
          provider: 'local',
          models: response.data
        };
      }
    } catch (error) {
      console.warn(`⚠️ ${this.provider} no disponible, intentando fallback...`);

      // Fallback: intentar con Groq si está configurado
      if (this.provider !== 'groq' && this.groqApiKey) {
        try {
          const response = await this.groqClient.get('/models');
          console.log('✅ Fallback a Groq exitoso');
          this.provider = 'groq'; // Cambiar provider
          return {
            connected: true,
            provider: 'groq',
            models: response.data
          };
        } catch (groqError) {
          console.error('❌ Groq también falló');
        }
      }

      return {
        connected: false,
        error: error.message
      };
    }
  }

  // 💬 Chat completion genérico (soporta todos los providers)
  async chatCompletion(messages, options = {}) {
    try {
      let client, modelToUse;

      // Determinar cliente y modelo según el provider
      if (this.provider === 'groq' && this.groqApiKey) {
        client = this.groqClient;
        modelToUse = options.model || 'llama-3.1-70b-versatile'; // Modelo gratuito de Groq
      } else if (this.provider === 'openai' && this.openaiApiKey) {
        client = this.openaiClient;
        modelToUse = options.model || 'gpt-3.5-turbo';
      } else {
        client = this.localClient;
        // Detectar modelo local automáticamente
        const modelsResponse = await this.checkConnection();
        if (modelsResponse.connected && modelsResponse.models?.data?.length > 0) {
          modelToUse = modelsResponse.models.data[0].id;
        } else {
          modelToUse = 'meta-llama-3.1-8b-instruct';
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

      const endpoint = this.provider === 'local' ? '/v1/chat/completions' : '/chat/completions';
      const response = await client.post(endpoint, payload);

      return {
        success: true,
        content: response.data.choices[0].message.content,
        usage: response.data.usage,
        model: response.data.model,
        provider: this.provider
      };
    } catch (error) {
      console.error('❌ Error en chat completion:', error.message);

      // Intentar fallback automático a Groq
      if (this.provider !== 'groq' && this.groqApiKey) {
        console.log('🔄 Intentando fallback a Groq...');
        try {
          const payload = {
            model: 'llama-3.1-70b-versatile',
            messages: messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens || 1000,
            stream: false
          };

          const response = await this.groqClient.post('/chat/completions', payload);
          console.log('✅ Fallback a Groq exitoso');

          return {
            success: true,
            content: response.data.choices[0].message.content,
            usage: response.data.usage,
            model: response.data.model,
            provider: 'groq (fallback)'
          };
        } catch (fallbackError) {
          console.error('❌ Fallback a Groq también falló');
        }
      }

      return {
        success: false,
        error: error.message,
        details: error.response?.data || null
      };
    }
  }

  // 📄 RF-102: Analizar contenido de CV
  async analizarCV(contenidoTexto, nombreAlumno = '') {
    // Importar el servicio de CV de referencia
    const referenceCVService = require('./reference-cv.service');

    let prompt;

    // Intentar usar el CV de referencia para comparación
    try {
      prompt = await referenceCVService.getComparativePrompt(contenidoTexto);
    } catch (error) {
      console.warn('⚠️ No se pudo cargar CV de referencia, usando análisis estándar', error.message);

      // Fallback al análisis estándar si no hay CV de referencia
      prompt = `Analiza este CV y responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin explicaciones):

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
    }

    const messages = [
      {
        role: 'system',
        content: 'Eres un analista de recursos humanos especializado en los estándares profesionales de TECSUP. Tu trabajo es evaluar CVs según el formato y contenido oficial de TECSUP, comparándolos con el CV de referencia institucional. Proporciona retroalimentación específica y accionable basada en las mejores prácticas de TECSUP. Responde ÚNICAMENTE con JSON válido, sin markdown ni explicaciones adicionales.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const response = await this.chatCompletion(messages, {
        temperature: 0.2,
        max_tokens: 500 // Reducido de 600 a 500 para respuestas más rápidas
      });

      if (!response.success) {
        throw new Error(response.error);
      }

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

      console.log(`Respuesta de IA (${response.provider}):`, cleanContent.substring(0, 100) + '...');

      const analisis = JSON.parse(cleanContent);

      return {
        success: true,
        analisis: analisis,
        contenido_extraido: response.content,
        provider: response.provider
      };
    } catch (error) {
      console.error('Error analizando CV:', error);

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
        evaluacion: evaluacion,
        provider: response.provider
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
        pregunta: response.content.trim(),
        provider: response.provider
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
        resumen: response.success ? response.content : 'Resumen pendiente de generación',
        provider: response.provider
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
    console.log(`🧪 Probando conexión con ${this.provider.toUpperCase()}...`);

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
      console.log(`✅ Conexión exitosa con ${result.provider}:`, result.content);
    } else {
      console.log('❌ Error de conexión:', result.error);
    }

    return result;
  }
}

// Singleton instance
const llamaService = new LlamaService();

module.exports = llamaService;
