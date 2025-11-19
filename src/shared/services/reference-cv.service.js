const path = require('path');
const fileExtractorService = require('./file-extractor.service');
const logger = require('./logger.service');

/**
 * Servicio para manejar el CV de referencia oficial de TECSUP (CV_ejemplo.docx)
 * Este CV se usa como plantilla estándar de TECSUP para comparar y evaluar
 * los CVs de los usuarios según los estándares profesionales de la institución
 */
class ReferenceCVService {
  constructor() {
    this.referenceFilePath = path.join(__dirname, '../reference-files/CV_ejemplo.docx');
    this.referenceContent = null;
    this.referenceAnalysis = null;
    this.isInitialized = false;
    this.institution = 'TECSUP'; // Institución que define el estándar
  }

  /**
   * Inicializa el servicio extrayendo el contenido del CV de referencia de TECSUP
   */
  async initialize() {
    if (this.isInitialized) {
      return { success: true, message: 'Ya inicializado' };
    }

    try {
      logger.info('Inicializando servicio de CV de referencia oficial de TECSUP...');

      // Extraer texto del CV de ejemplo oficial de TECSUP
      const extractionResult = await fileExtractorService.extractText(
        this.referenceFilePath,
        '.docx'
      );

      if (!extractionResult.success) {
        throw new Error(`Error extrayendo CV de referencia de TECSUP: ${extractionResult.error}`);
      }

      this.referenceContent = fileExtractorService.cleanText(extractionResult.text);

      logger.success('CV de referencia oficial de TECSUP cargado correctamente', {
        institution: this.institution,
        length: this.referenceContent.length,
        words: this.referenceContent.split(/\s+/).length
      });

      this.isInitialized = true;

      return {
        success: true,
        message: 'CV de referencia de TECSUP inicializado',
        institution: this.institution,
        stats: {
          characters: this.referenceContent.length,
          words: this.referenceContent.split(/\s+/).length
        }
      };

    } catch (error) {
      logger.error('Error inicializando CV de referencia de TECSUP', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtiene el contenido del CV de referencia oficial de TECSUP
   */
  async getReferenceContent() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.referenceContent;
  }

  /**
   * Genera un prompt comparativo que incluye el CV de referencia de TECSUP
   */
  async getComparativePrompt(userCVContent) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const referenceCV = this.referenceContent.substring(0, 1500);
    const userCV = userCVContent.substring(0, 1500);

    return `A continuación te proporcionaré DOS CVs:

1. **CV DE REFERENCIA OFICIAL DE TECSUP (IDEAL)**: Este es el CV de ejemplo oficial de TECSUP que representa el formato, estructura y contenido ideal que la institución espera de sus egresados y estudiantes. Este CV cumple con los estándares profesionales de TECSUP.

2. **CV DEL USUARIO**: Este es el CV que debe ser evaluado y comparado con el CV de referencia de TECSUP.

Tu tarea es:
- Analizar el CV del usuario según los estándares de TECSUP
- Compararlo con el CV de referencia oficial de TECSUP
- Identificar qué le falta al CV del usuario para cumplir con los estándares de TECSUP
- Proporcionar recomendaciones específicas basadas en las mejores prácticas de TECSUP
- Evaluar qué tan cercano está el CV del usuario al formato profesional esperado por TECSUP

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin explicaciones):

{
  "fortalezas": ["fortaleza1 del CV según estándares TECSUP", "fortaleza2", "fortaleza3"],
  "habilidades_tecnicas": ["habilidad1", "habilidad2"],
  "habilidades_blandas": ["habilidad1", "habilidad2"],
  "areas_mejora": ["area1 - explicación de qué mejorar según el CV de TECSUP", "area2"],
  "diferencias_con_referencia": ["Diferencia 1 con el formato TECSUP", "Diferencia 2", "Diferencia 3"],
  "recomendaciones_especificas": ["Agregar sección X como en el CV oficial de TECSUP", "Mejorar formato Y según estándares TECSUP"],
  "similitud_con_ideal": 75,
  "experiencia_resumen": "resumen breve de experiencia",
  "educacion_resumen": "resumen breve de educación",
  "cumple_estandares_tecsup": true
}

==================================================
CV DE REFERENCIA OFICIAL DE TECSUP (IDEAL):
==================================================
${referenceCV}

==================================================
CV DEL USUARIO A EVALUAR:
==================================================
${userCV}

Analiza y compara ambos CVs, enfocándote en cómo mejorar el CV del usuario para que cumpla con los estándares profesionales de TECSUP representados en el CV de referencia.`;
  }
}

// Exportar instancia única (Singleton)
module.exports = new ReferenceCVService();
