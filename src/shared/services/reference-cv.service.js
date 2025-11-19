const path = require('path');
const fileExtractorService = require('./file-extractor.service');
const logger = require('./logger.service');

/**
 * Servicio para manejar el CV de referencia (CV_ejemplo.docx)
 * Este CV se usa como plantilla para comparar y evaluar los CVs de los usuarios
 */
class ReferenceCVService {
  constructor() {
    this.referenceFilePath = path.join(__dirname, '../reference-files/CV_ejemplo.docx');
    this.referenceContent = null;
    this.referenceAnalysis = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa el servicio extrayendo el contenido del CV de referencia
   */
  async initialize() {
    if (this.isInitialized) {
      return { success: true, message: 'Ya inicializado' };
    }

    try {
      logger.info('Inicializando servicio de CV de referencia...');

      // Extraer texto del CV de ejemplo
      const extractionResult = await fileExtractorService.extractText(
        this.referenceFilePath,
        '.docx'
      );

      if (!extractionResult.success) {
        throw new Error(`Error extrayendo CV de referencia: ${extractionResult.error}`);
      }

      this.referenceContent = fileExtractorService.cleanText(extractionResult.text);

      logger.success('CV de referencia cargado correctamente', {
        length: this.referenceContent.length,
        words: this.referenceContent.split(/\s+/).length
      });

      this.isInitialized = true;

      return {
        success: true,
        message: 'CV de referencia inicializado',
        stats: {
          characters: this.referenceContent.length,
          words: this.referenceContent.split(/\s+/).length
        }
      };

    } catch (error) {
      logger.error('Error inicializando CV de referencia', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtiene el contenido del CV de referencia
   */
  async getReferenceContent() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.referenceContent;
  }

  /**
   * Genera un prompt comparativo que incluye el CV de referencia
   */
  async getComparativePrompt(userCVContent) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const referenceCV = this.referenceContent.substring(0, 1500);
    const userCV = userCVContent.substring(0, 1500);

    return `A continuación te proporcionaré DOS CVs:

1. **CV DE REFERENCIA (IDEAL)**: Este es un CV de ejemplo que representa el formato, estructura y contenido ideal que esperamos.

2. **CV DEL USUARIO**: Este es el CV que debe ser evaluado y comparado con el CV de referencia.

Tu tarea es:
- Analizar el CV del usuario
- Compararlo con el CV de referencia
- Identificar qué le falta al CV del usuario para ser como el CV de referencia
- Proporcionar recomendaciones específicas para mejorar el CV del usuario

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin explicaciones):

{
  "fortalezas": ["fortaleza1", "fortaleza2", "fortaleza3"],
  "habilidades_tecnicas": ["habilidad1", "habilidad2"],
  "habilidades_blandas": ["habilidad1", "habilidad2"],
  "areas_mejora": ["area1 - explicación de qué mejorar comparado con el CV ideal", "area2"],
  "diferencias_con_referencia": ["diferencia1", "diferencia2", "diferencia3"],
  "recomendaciones_especificas": ["Agregar sección X como en el CV ideal", "Mejorar formato de Y"],
  "similitud_con_ideal": 75,
  "experiencia_resumen": "resumen breve de experiencia",
  "educacion_resumen": "resumen breve de educación"
}

==================================================
CV DE REFERENCIA (IDEAL):
==================================================
${referenceCV}

==================================================
CV DEL USUARIO A EVALUAR:
==================================================
${userCV}

Analiza y compara ambos CVs, enfocándote en cómo mejorar el CV del usuario para que se parezca al CV ideal.`;
  }
}

// Exportar instancia única (Singleton)
module.exports = new ReferenceCVService();
