const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class UtilsService {

  // 🔑 Generar ID único
  generateUniqueId() {
    return crypto.randomBytes(16).toString('hex');
  }

  // 📅 Formatear fecha
  formatDate(date, format = 'es') {
    const d = new Date(date);
    
    if (format === 'es') {
      return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return d.toISOString();
  }

  // ⏰ Calcular tiempo transcurrido
  timeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);
    
    if (years > 0) return `hace ${years} año${years > 1 ? 's' : ''}`;
    if (months > 0) return `hace ${months} mes${months > 1 ? 'es' : ''}`;
    if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'hace unos segundos';
  }

  // 🔤 Limpiar texto para URLs
  slugify(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^\w\s-]/g, '') // Solo letras, números, espacios y guiones
      .replace(/[\s_-]+/g, '-') // Espacios y guiones múltiples a uno solo
      .replace(/^-+|-+$/g, ''); // Eliminar guiones al inicio y final
  }

  // 📊 Calcular estadísticas básicas
  calculateStats(numbers) {
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return null;
    }

    const validNumbers = numbers.filter(n => typeof n === 'number' && !isNaN(n));
    
    if (validNumbers.length === 0) return null;

    const sum = validNumbers.reduce((a, b) => a + b, 0);
    const avg = sum / validNumbers.length;
    const sorted = [...validNumbers].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    return {
      count: validNumbers.length,
      sum: parseFloat(sum.toFixed(2)),
      average: parseFloat(avg.toFixed(2)),
      median: parseFloat(median.toFixed(2)),
      min: Math.min(...validNumbers),
      max: Math.max(...validNumbers)
    };
  }

  // 🎯 Calcular puntuación de completitud de CV
  calculateCVCompletenessScore(cvData) {
    const weights = {
      hasName: 20,
      hasContact: 20,
      hasExperience: 25,
      hasEducation: 20,
      hasSkills: 15
    };

    let score = 0;
    let maxScore = 0;

    for (const [field, weight] of Object.entries(weights)) {
      maxScore += weight;
      if (cvData[field]) {
        score += weight;
      }
    }

    return {
      score: Math.round((score / maxScore) * 100),
      breakdown: Object.entries(weights).map(([field, weight]) => ({
        field,
        weight,
        completed: !!cvData[field],
        points: cvData[field] ? weight : 0
      }))
    };
  }

  // 📈 Determinar nivel de habilidad basado en puntuación
  getSkillLevel(score) {
    if (score >= 9) return { level: 'Experto', color: '#10B981', description: 'Dominio excepcional' };
    if (score >= 8) return { level: 'Avanzado', color: '#3B82F6', description: 'Muy competente' };
    if (score >= 7) return { level: 'Intermedio', color: '#F59E0B', description: 'Buen nivel' };
    if (score >= 5) return { level: 'Básico', color: '#EF4444', description: 'Conocimientos básicos' };
    return { level: 'Principiante', color: '#6B7280', description: 'Necesita desarrollo' };
  }

  // 🌟 Generar recomendaciones basadas en puntuación
  generateRecommendations(averageScore, lastScore, trend) {
    const recommendations = [];

    if (averageScore < 6) {
      recommendations.push({
        type: 'improvement',
        title: 'Práctica intensiva recomendada',
        description: 'Tu promedio está por debajo del nivel esperado. Considera practicar más frecuentemente.',
        priority: 'high'
      });
    }

    if (trend === 'declining' && lastScore < averageScore - 1) {
      recommendations.push({
        type: 'warning',
        title: 'Tendencia descendente detectada',
        description: 'Tus últimas entrevistas han mostrado una disminución en el rendimiento.',
        priority: 'medium'
      });
    }

    if (averageScore >= 8) {
      recommendations.push({
        type: 'success',
        title: '¡Excelente rendimiento!',
        description: 'Mantén este nivel y considera practicar entrevistas más desafiantes.',
        priority: 'low'
      });
    }

    if (trend === 'improving') {
      recommendations.push({
        type: 'motivation',
        title: 'Progreso positivo',
        description: 'Has mostrado mejora constante. ¡Continúa con esta tendencia!',
        priority: 'low'
      });
    }

    return recommendations;
  }

  // 📝 Truncar texto con puntos suspensivos
  truncateText(text, maxLength = 100, suffix = '...') {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  // 🎨 Generar color hexadecimal aleatorio
  generateRandomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }

  // 📋 Sanitizar nombre de archivo
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-z0-9.\-_]/gi, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  // 🔍 Validar y extraer extensión de archivo
  getFileInfo(filename) {
    const ext = path.extname(filename).toLowerCase();
    const name = path.basename(filename, ext);
    
    return {
      name: name,
      extension: ext,
      fullname: filename,
      sanitizedName: this.sanitizeFilename(name),
      isValid: ['.pdf', '.docx', '.doc'].includes(ext)
    };
  }

  // 💾 Crear directorio si no existe
  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      return true;
    }
    return false;
  }

  // 🧮 Formatear números grandes
  formatLargeNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  }

  // 🎯 Evaluar fuerza de contraseña
  evaluatePasswordStrength(password) {
    let score = 0;
    const feedback = [];

    if (password.length >= 8) score += 20;
    else feedback.push('Usar al menos 8 caracteres');

    if (/[a-z]/.test(password)) score += 20;
    else feedback.push('Incluir letras minúsculas');

    if (/[A-Z]/.test(password)) score += 20;
    else feedback.push('Incluir letras mayúsculas');

    if (/\d/.test(password)) score += 20;
    else feedback.push('Incluir números');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 20;
    else feedback.push('Incluir símbolos especiales');

    let strength;
    if (score >= 80) strength = 'Muy fuerte';
    else if (score >= 60) strength = 'Fuerte';
    else if (score >= 40) strength = 'Regular';
    else if (score >= 20) strength = 'Débil';
    else strength = 'Muy débil';

    return { score, strength, feedback };
  }

  // 🚀 Generar respuesta API estandarizada
  createApiResponse(success = true, data = null, message = '', errors = []) {
    const response = { success };
    
    if (message) response.message = message;
    if (data !== null) response.data = data;
    if (errors.length > 0) response.errors = errors;
    if (!success && !message) response.message = 'Operación fallida';
    
    response.timestamp = new Date().toISOString();
    
    return response;
  }

  // 🧪 Test de utilidades
  runTests() {
    console.log('🧪 Ejecutando tests de utilidades...');
    
    const tests = {
      slugify: this.slugify('Hola Mundo 123!') === 'hola-mundo-123',
      timeAgo: this.timeAgo(new Date(Date.now() - 60000)).includes('minuto'),
      stats: this.calculateStats([1, 2, 3, 4, 5]).average === 3,
      skillLevel: this.getSkillLevel(8.5).level === 'Avanzado',
      fileInfo: this.getFileInfo('documento.pdf').isValid === true
    };

    console.log('Resultados de tests:', tests);
    return tests;
  }

}

// Singleton instance
const utilsService = new UtilsService();

module.exports = utilsService;