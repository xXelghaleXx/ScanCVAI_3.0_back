const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

class FileExtractorService {

  // 📄 Extraer texto de PDF
  async extractFromPDF(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('Archivo PDF no encontrado');
      }

      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);

      return {
        success: true,
        text: data.text,
        metadata: {
          pages: data.numpages,
          info: data.info,
          version: data.version
        },
        stats: {
          characters: data.text.length,
          words: data.text.split(/\s+/).length,
          lines: data.text.split('\n').length
        }
      };

    } catch (error) {
      console.error('❌ Error extrayendo PDF:', error);
      return {
        success: false,
        error: error.message,
        text: ''
      };
    }
  }

  // 📝 Extraer texto de DOCX
  async extractFromDOCX(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('Archivo DOCX no encontrado');
      }

      const result = await mammoth.extractRawText({ path: filePath });
      
      return {
        success: true,
        text: result.value,
        warnings: result.messages,
        stats: {
          characters: result.value.length,
          words: result.value.split(/\s+/).length,
          lines: result.value.split('\n').length
        }
      };

    } catch (error) {
      console.error('❌ Error extrayendo DOCX:', error);
      return {
        success: false,
        error: error.message,
        text: ''
      };
    }
  }

  // 📋 Extraer texto automático según extensión
  async extractText(filePath) {
    try {
      const extension = path.extname(filePath).toLowerCase();
      
      console.log(`📖 Extrayendo texto de: ${path.basename(filePath)} (${extension})`);
      
      let result;
      
      switch (extension) {
        case '.pdf':
          result = await this.extractFromPDF(filePath);
          break;
          
        case '.docx':
          result = await this.extractFromDOCX(filePath);
          break;
          
        case '.doc':
          // Para archivos .doc antiguos, intentar con mammoth también
          result = await this.extractFromDOCX(filePath);
          break;
          
        default:
          throw new Error(`Formato de archivo no soportado: ${extension}`);
      }

      if (result.success) {
        // RF-101: Validaciones adicionales del contenido
        const validation = this.validateExtractedContent(result.text);
        result.validation = validation;
        
        console.log(`✅ Texto extraído exitosamente: ${result.stats.characters} caracteres`);
      }

      return result;

    } catch (error) {
      console.error('❌ Error en extracción automática:', error);
      return {
        success: false,
        error: error.message,
        text: ''
      };
    }
  }

  // ✅ RF-101: Validar contenido extraído
  validateExtractedContent(text) {
    const validation = {
      isValid: true,
      warnings: [],
      score: 0,
      requiredFields: {
        hasName: false,
        hasContact: false,
        hasExperience: false,
        hasEducation: false,
        hasSkills: false
      }
    };

    // Verificar longitud mínima
    if (text.length < 100) {
      validation.warnings.push('El contenido del CV es muy corto (menos de 100 caracteres)');
      validation.score -= 20;
    }

    // Buscar indicadores de nombre
    const namePatterns = [
      /nombre[\s:]+[a-záéíóúñ\s]+/i,
      /^[A-Z][a-záéíóúñ]+[\s]+[A-Z][a-záéíóúñ]+/m,
      /curriculum[\s]+vitae[\s]+de[\s:]+([a-záéíóúñ\s]+)/i
    ];
    
    if (namePatterns.some(pattern => pattern.test(text))) {
      validation.requiredFields.hasName = true;
      validation.score += 20;
    } else {
      validation.warnings.push('No se detectó claramente el nombre del candidato');
    }

    // Buscar información de contacto
    const contactPatterns = [
      /(\+?[\d\s\-\(\)]{8,})/,  // Teléfono
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
      /(dirección|domicilio|ubicación)[\s:]/i
    ];
    
    if (contactPatterns.some(pattern => pattern.test(text))) {
      validation.requiredFields.hasContact = true;
      validation.score += 20;
    } else {
      validation.warnings.push('Información de contacto incompleta o no detectada');
    }

    // Buscar experiencia laboral
    const experiencePatterns = [
      /(experiencia|trabajo|empleo|cargo|puesto)[\s]+(laboral|profesional)?/i,
      /(empresa|compañía|organización)[\s:]/i,
      /\d{4}[\s]*[-–—][\s]*\d{4}/, // Rangos de fechas
      /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i
    ];
    
    if (experiencePatterns.some(pattern => pattern.test(text))) {
      validation.requiredFields.hasExperience = true;
      validation.score += 20;
    } else {
      validation.warnings.push('No se detectó experiencia laboral clara');
    }

    // Buscar educación
    const educationPatterns = [
      /(educación|formación|estudios|título|grado|carrera|universidad|instituto)/i,
      /(licenciatura|ingeniería|técnico|maestría|doctorado)/i,
      /(bachiller|graduado|titulado)/i
    ];
    
    if (educationPatterns.some(pattern => pattern.test(text))) {
      validation.requiredFields.hasEducation = true;
      validation.score += 20;
    } else {
      validation.warnings.push('No se detectó formación académica');
    }

    // Buscar habilidades
    const skillsPatterns = [
      /(habilidades|competencias|skills|conocimientos)/i,
      /(programación|software|idiomas|herramientas)/i,
      /(excel|word|photoshop|java|python|javascript)/i
    ];
    
    if (skillsPatterns.some(pattern => pattern.test(text))) {
      validation.requiredFields.hasSkills = true;
      validation.score += 20;
    } else {
      validation.warnings.push('No se detectaron habilidades específicas');
    }

    // Determinar si es válido
    validation.isValid = validation.score >= 60;
    
    if (!validation.isValid) {
      validation.warnings.unshift('El CV no cumple con los campos mínimos requeridos');
    }

    return validation;
  }

  // 🧹 Limpiar y formatear texto extraído
  cleanText(text) {
    return text
      // Normalizar espacios en blanco
      .replace(/\s+/g, ' ')
      // Eliminar líneas muy cortas (probablemente ruido)
      .split('\n')
      .filter(line => line.trim().length > 2)
      .join('\n')
      // Eliminar caracteres especiales problemáticos
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();
  }

  // 📊 Obtener estadísticas del archivo
  getFileStats(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const extension = path.extname(filePath).toLowerCase();
      
      return {
        size: stats.size,
        sizeFormatted: this.formatBytes(stats.size),
        extension: extension,
        created: stats.birthtime,
        modified: stats.mtime,
        filename: path.basename(filePath)
      };
    } catch (error) {
      return null;
    }
  }

  // 🔢 Formatear bytes
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // 🧪 Test de extracción
  async testExtraction() {
    console.log('🧪 Probando servicios de extracción...');
    
    // Crear archivo de prueba temporal si no existe
    const testText = `
CURRICULUM VITAE

Nombre: Juan Pérez
Email: juan.perez@email.com
Teléfono: +1234567890

EXPERIENCIA LABORAL
2020-2023: Desarrollador en TechCorp
- Programación en JavaScript y Python
- Desarrollo de aplicaciones web

EDUCACIÓN
2016-2020: Ingeniería en Sistemas - Universidad Nacional

HABILIDADES
- JavaScript, Python, React
- Bases de datos SQL
- Trabajo en equipo
    `;
    
    return {
      testText: testText,
      validation: this.validateExtractedContent(testText),
      cleaned: this.cleanText(testText)
    };
  }

}

// Singleton instance
const fileExtractorService = new FileExtractorService();

module.exports = fileExtractorService;