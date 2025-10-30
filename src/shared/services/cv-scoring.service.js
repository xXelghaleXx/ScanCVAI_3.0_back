/**
 * CVScoringService - Sistema de puntuación para CVs
 *
 * Evalúa CVs en base a criterios del CV modelo (16848.docx):
 * - Completitud de secciones (30%)
 * - Calidad del contenido (30%)
 * - Formato y estructura (20%)
 * - Experiencia y educación (20%)
 */

class CVScoringService {

  /**
   * Calcula la puntuación total de un CV
   * @param {Object} validation - Datos de validación del CV
   * @param {Object} analisis - Análisis de IA del CV
   * @param {Object} stats - Estadísticas del CV
   * @returns {Object} - Puntuación y métricas detalladas
   */
  static calcularPuntuacionCV(validation, analisis, stats) {
    // Validaciones
    if (!validation || !analisis) {
      return this.generarPuntuacionMinima();
    }

    // 1. Calcular puntos por completitud (30%)
    const puntosCompletitud = this.calcularPuntosCompletitud(validation);

    // 2. Calcular puntos por calidad de contenido (30%)
    const puntosCalidad = this.calcularPuntosCalidad(analisis, stats);

    // 3. Calcular puntos por formato y estructura (20%)
    const puntosFormato = this.calcularPuntosFormato(validation, stats);

    // 4. Calcular puntos por experiencia y educación (20%)
    const puntosExperiencia = this.calcularPuntosExperienciaEducacion(analisis);

    // 5. Calcular puntuación base (0-10)
    const puntuacionBase = (
      puntosCompletitud * 0.30 +
      puntosCalidad * 0.30 +
      puntosFormato * 0.20 +
      puntosExperiencia * 0.20
    );

    // 6. Convertir a escala 0-100
    const puntuacionFinal = Math.min(100, Math.round(puntuacionBase * 10));

    // 7. Determinar si el CV es ideal (>= 80 puntos)
    const esIdeal = puntuacionFinal >= 80;
    const nivel = this.determinarNivelCV(puntuacionFinal);

    return {
      puntuacion_final: puntuacionFinal,
      es_cv_ideal: esIdeal,
      nivel_cv: nivel,
      metricas: {
        completitud: Math.round(puntosCompletitud * 10),
        calidad_contenido: Math.round(puntosCalidad * 10),
        formato_estructura: Math.round(puntosFormato * 10),
        experiencia_educacion: Math.round(puntosExperiencia * 10)
      },
      desglose_puntos: {
        completitud: {
          puntos: parseFloat(puntosCompletitud.toFixed(2)),
          peso: '30%',
          contribucion: parseFloat((puntosCompletitud * 0.30).toFixed(2))
        },
        calidad: {
          puntos: parseFloat(puntosCalidad.toFixed(2)),
          peso: '30%',
          contribucion: parseFloat((puntosCalidad * 0.30).toFixed(2))
        },
        formato: {
          puntos: parseFloat(puntosFormato.toFixed(2)),
          peso: '20%',
          contribucion: parseFloat((puntosFormato * 0.20).toFixed(2))
        },
        experiencia: {
          puntos: parseFloat(puntosExperiencia.toFixed(2)),
          peso: '20%',
          contribucion: parseFloat((puntosExperiencia * 0.20).toFixed(2))
        },
        base: parseFloat(puntuacionBase.toFixed(2))
      },
      recomendacion: esIdeal
        ? 'Tu CV cumple con los estándares ideales. ¡Excelente trabajo!'
        : 'Tu CV tiene áreas de mejora. Revisa el informe detallado para optimizarlo.'
    };
  }

  /**
   * Calcula puntos por completitud de secciones
   * CV ideal debe tener: nombre, contacto, experiencia, educación, habilidades
   */
  static calcularPuntosCompletitud(validation) {
    const { requiredFields } = validation;

    if (!requiredFields) return 5;

    let puntos = 0;
    const camposRequeridos = [
      'tiene_nombre',
      'tiene_contacto',
      'tiene_experiencia',
      'tiene_educacion',
      'tiene_habilidades'
    ];

    const camposPresentes = camposRequeridos.filter(campo =>
      requiredFields[campo] === true
    ).length;

    // Escala: 5 campos = 10pts, 4 = 8pts, 3 = 6pts, 2 = 4pts, 1 = 2pts
    if (camposPresentes === 5) puntos = 10;
    else if (camposPresentes === 4) puntos = 8;
    else if (camposPresentes === 3) puntos = 6;
    else if (camposPresentes === 2) puntos = 4;
    else if (camposPresentes === 1) puntos = 2;

    return puntos;
  }

  /**
   * Calcula puntos por calidad del contenido
   * Basado en fortalezas, habilidades detectadas y análisis
   */
  static calcularPuntosCalidad(analisis, stats) {
    let puntos = 0;

    // Fortalezas (3 pts)
    const numFortalezas = analisis.fortalezas?.length || 0;
    if (numFortalezas >= 5) puntos += 3;
    else if (numFortalezas >= 3) puntos += 2;
    else if (numFortalezas >= 1) puntos += 1;

    // Habilidades técnicas (3 pts)
    const numHabilidadesTec = analisis.habilidades_tecnicas?.length || 0;
    if (numHabilidadesTec >= 5) puntos += 3;
    else if (numHabilidadesTec >= 3) puntos += 2;
    else if (numHabilidadesTec >= 1) puntos += 1;

    // Habilidades blandas (2 pts)
    const numHabilidadesBlandas = analisis.habilidades_blandas?.length || 0;
    if (numHabilidadesBlandas >= 3) puntos += 2;
    else if (numHabilidadesBlandas >= 1) puntos += 1;

    // Contenido descriptivo (2 pts)
    const palabras = stats?.wordCount || 0;
    if (palabras >= 500) puntos += 2;
    else if (palabras >= 300) puntos += 1;

    return Math.min(10, puntos);
  }

  /**
   * Calcula puntos por formato y estructura
   * Basado en validación y estadísticas del documento
   */
  static calcularPuntosFormato(validation, stats) {
    let puntos = 5; // Base

    // Longitud adecuada del CV
    const palabras = stats?.wordCount || 0;
    if (palabras >= 300 && palabras <= 1000) {
      puntos += 2; // Longitud ideal
    } else if (palabras >= 200 && palabras <= 1500) {
      puntos += 1; // Aceptable
    }

    // Estructura clara (basada en score de validación)
    const scoreValidacion = validation.score || 0;
    if (scoreValidacion >= 80) {
      puntos += 3;
    } else if (scoreValidacion >= 60) {
      puntos += 2;
    } else if (scoreValidacion >= 40) {
      puntos += 1;
    }

    return Math.min(10, puntos);
  }

  /**
   * Calcula puntos por experiencia y educación
   */
  static calcularPuntosExperienciaEducacion(analisis) {
    let puntos = 0;

    // Experiencia laboral (5 pts)
    const tieneExperiencia = analisis.experiencia_resumen &&
                             analisis.experiencia_resumen.length > 50;
    if (tieneExperiencia) {
      const palabrasExp = analisis.experiencia_resumen.split(/\s+/).length;
      if (palabrasExp >= 100) puntos += 5;
      else if (palabrasExp >= 50) puntos += 3;
      else puntos += 2;
    }

    // Educación (5 pts)
    const tieneEducacion = analisis.educacion_resumen &&
                           analisis.educacion_resumen.length > 30;
    if (tieneEducacion) {
      const palabrasEdu = analisis.educacion_resumen.split(/\s+/).length;
      if (palabrasEdu >= 50) puntos += 5;
      else if (palabrasEdu >= 30) puntos += 3;
      else puntos += 2;
    }

    return Math.min(10, puntos);
  }

  /**
   * Determina el nivel del CV según puntuación
   */
  static determinarNivelCV(puntuacion) {
    if (puntuacion >= 90) return 'Excepcional';
    if (puntuacion >= 80) return 'Excelente';
    if (puntuacion >= 70) return 'Muy Bueno';
    if (puntuacion >= 60) return 'Bueno';
    if (puntuacion >= 50) return 'Aceptable';
    return 'Necesita Mejoras';
  }

  /**
   * Genera análisis de las métricas del CV
   */
  static generarAnalisisMetricas(resultado) {
    const { puntuacion_final, metricas, nivel_cv, es_cv_ideal } = resultado;
    const analisis = [];

    // Análisis de completitud
    if (metricas.completitud >= 90) {
      analisis.push('✅ Tu CV incluye todas las secciones esenciales');
    } else if (metricas.completitud >= 70) {
      analisis.push('⚠️ Tu CV tiene la mayoría de secciones, considera agregar las faltantes');
    } else {
      analisis.push('❌ Tu CV carece de secciones importantes. Agrega experiencia, educación y habilidades');
    }

    // Análisis de calidad
    if (metricas.calidad_contenido >= 80) {
      analisis.push('✅ Excelente detalle en fortalezas y habilidades');
    } else if (metricas.calidad_contenido >= 60) {
      analisis.push('⚠️ Buen contenido, pero puedes agregar más habilidades específicas');
    } else {
      analisis.push('❌ Amplía la descripción de tus habilidades y logros');
    }

    // Análisis de formato
    if (metricas.formato_estructura >= 80) {
      analisis.push('✅ Formato y estructura profesionales');
    } else if (metricas.formato_estructura >= 60) {
      analisis.push('⚠️ Mejora la organización y longitud del CV');
    } else {
      analisis.push('❌ El formato necesita mejorar. Asegúrate de tener una estructura clara');
    }

    // Análisis de experiencia
    if (metricas.experiencia_educacion >= 80) {
      analisis.push('✅ Experiencia y educación bien documentadas');
    } else if (metricas.experiencia_educacion >= 60) {
      analisis.push('⚠️ Agrega más detalles a tu experiencia y educación');
    } else {
      analisis.push('❌ Amplía significativamente las secciones de experiencia y educación');
    }

    return {
      resumen: `Tu CV obtuvo ${puntuacion_final}/100 puntos (${nivel_cv})`,
      es_ideal: es_cv_ideal,
      analisis_detallado: analisis,
      siguiente_paso: es_cv_ideal
        ? 'Tu CV está listo para aplicar a ofertas laborales'
        : 'Revisa las recomendaciones y genera el informe de mejoras'
    };
  }

  /**
   * Genera puntuación mínima para casos inválidos
   */
  static generarPuntuacionMinima() {
    return {
      puntuacion_final: 0,
      es_cv_ideal: false,
      nivel_cv: 'Sin Evaluar',
      metricas: {
        completitud: 0,
        calidad_contenido: 0,
        formato_estructura: 0,
        experiencia_educacion: 0
      },
      desglose_puntos: {
        completitud: { puntos: 0, peso: '30%', contribucion: 0 },
        calidad: { puntos: 0, peso: '30%', contribucion: 0 },
        formato: { puntos: 0, peso: '20%', contribucion: 0 },
        experiencia: { puntos: 0, peso: '20%', contribucion: 0 },
        base: 0
      },
      recomendacion: 'No se pudo evaluar el CV. Por favor, sube un CV válido.'
    };
  }
}

module.exports = CVScoringService;
