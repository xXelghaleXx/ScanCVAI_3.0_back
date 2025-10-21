/**
 * ScoringService - Sistema de puntuación inteligente para entrevistas
 *
 * Este servicio calcula puntuaciones basadas en métricas reales:
 * - Cantidad de respuestas (30%)
 * - Densidad/calidad de respuestas (40%)
 * - Consistencia en las respuestas (20%)
 * - Completitud de la entrevista (10%)
 * - Bonus por dificultad
 */

class ScoringService {

  /**
   * Calcula la puntuación total de una entrevista
   * @param {Array} mensajesUsuario - Mensajes enviados por el usuario
   * @param {Array} mensajesAsistente - Mensajes del entrevistador
   * @param {String} dificultad - Nivel de dificultad ('basica', 'intermedia', 'avanzada')
   * @returns {Object} - Puntuación y métricas detalladas
   */
  static calcularPuntuacion(mensajesUsuario, mensajesAsistente, dificultad = 'intermedia') {
    // Validaciones
    if (!mensajesUsuario || mensajesUsuario.length === 0) {
      return this.generarPuntuacionMinima();
    }

    // 1. Calcular puntos por cantidad (30%)
    const puntosCantidad = this.calcularPuntosPorCantidad(mensajesUsuario.length);

    // 2. Calcular puntos por densidad (40%)
    const { puntosDensidad, densidadPromedio, palabrasPromedio } = this.calcularPuntosPorDensidad(mensajesUsuario);

    // 3. Calcular puntos por consistencia (20%)
    const { puntosConsistencia, consistencia } = this.calcularPuntosPorConsistencia(mensajesUsuario);

    // 4. Calcular puntos por completitud (10%)
    const { puntosCompletitud, completitud } = this.calcularPuntosCompletitud(mensajesUsuario, mensajesAsistente);

    // 5. Calcular puntuación base (0-10)
    const puntuacionBase = (
      puntosCantidad * 0.30 +
      puntosDensidad * 0.40 +
      puntosConsistencia * 0.20 +
      puntosCompletitud * 0.10
    );

    // 6. Aplicar multiplicador por dificultad
    const multiplicador = this.getMultiplicadorDificultad(dificultad);

    // 7. Convertir a escala 0-100
    const puntuacionFinal = Math.min(100, Math.round(puntuacionBase * multiplicador * 10));

    // 8. Determinar nivel de desempeño
    const nivelDesempeno = this.determinarNivelDesempeno(puntuacionFinal);

    return {
      puntuacion_final: puntuacionFinal,
      nivel_desempeno: nivelDesempeno,
      metricas: {
        cantidad_respuestas: mensajesUsuario.length,
        densidad_promedio_caracteres: Math.round(densidadPromedio),
        palabras_promedio: Math.round(palabrasPromedio),
        consistencia_porcentaje: Math.round(consistencia),
        completitud_porcentaje: Math.round(completitud),
        multiplicador_dificultad: multiplicador
      },
      desglose_puntos: {
        cantidad: {
          puntos: parseFloat(puntosCantidad.toFixed(2)),
          peso: '30%',
          contribucion: parseFloat((puntosCantidad * 0.30).toFixed(2))
        },
        densidad: {
          puntos: parseFloat(puntosDensidad.toFixed(2)),
          peso: '40%',
          contribucion: parseFloat((puntosDensidad * 0.40).toFixed(2))
        },
        consistencia: {
          puntos: parseFloat(puntosConsistencia.toFixed(2)),
          peso: '20%',
          contribucion: parseFloat((puntosConsistencia * 0.20).toFixed(2))
        },
        completitud: {
          puntos: parseFloat(puntosCompletitud.toFixed(2)),
          peso: '10%',
          contribucion: parseFloat((puntosCompletitud * 0.10).toFixed(2))
        },
        base: parseFloat(puntuacionBase.toFixed(2)),
        multiplicador: multiplicador
      }
    };
  }

  /**
   * Calcula puntos basados en la cantidad de respuestas
   * Escala: 1-2 resp = 3pts, 3-4 = 5pts, 5-7 = 7pts, 8+ = 10pts
   */
  static calcularPuntosPorCantidad(cantidad) {
    if (cantidad >= 8) return 10;
    if (cantidad >= 5) return 7;
    if (cantidad >= 3) return 5;
    if (cantidad >= 1) return 3;
    return 0;
  }

  /**
   * Calcula puntos basados en la densidad y calidad de las respuestas
   * Considera tanto caracteres como palabras
   */
  static calcularPuntosPorDensidad(mensajes) {
    const longitudes = mensajes.map(m => m.content.length);
    const palabras = mensajes.map(m => m.content.trim().split(/\s+/).length);

    const densidadPromedio = longitudes.reduce((a, b) => a + b, 0) / longitudes.length;
    const palabrasPromedio = palabras.reduce((a, b) => a + b, 0) / palabras.length;

    let puntos = 0;

    // Basado en caracteres promedio
    if (densidadPromedio >= 300) puntos = 10;
    else if (densidadPromedio >= 150) puntos = 8;
    else if (densidadPromedio >= 50) puntos = 5;
    else puntos = 2;

    // Bonus si las respuestas tienen buena cantidad de palabras
    if (palabrasPromedio >= 50) puntos = Math.min(10, puntos + 1);
    else if (palabrasPromedio >= 30) puntos = Math.min(10, puntos + 0.5);

    return {
      puntosDensidad: puntos,
      densidadPromedio,
      palabrasPromedio
    };
  }

  /**
   * Calcula puntos basados en la consistencia de las respuestas
   * Valora respuestas de longitud similar (evita respuestas muy cortas mezcladas con largas)
   */
  static calcularPuntosPorConsistencia(mensajes) {
    if (mensajes.length < 2) {
      return { puntosConsistencia: 10, consistencia: 100 };
    }

    const longitudes = mensajes.map(m => m.content.length);
    const media = longitudes.reduce((a, b) => a + b, 0) / longitudes.length;

    // Calcular desviación estándar
    const varianza = longitudes.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / longitudes.length;
    const desviacionEstandar = Math.sqrt(varianza);

    // Coeficiente de variación (CV)
    const coeficienteVariacion = media > 0 ? (desviacionEstandar / media) * 100 : 100;

    // Calcular consistencia (inversa del CV)
    // CV bajo = alta consistencia
    let consistencia = 100 - Math.min(100, coeficienteVariacion);

    // Calcular puntos (0-10)
    let puntos = 0;
    if (consistencia >= 70) puntos = 10;
    else if (consistencia >= 50) puntos = 7;
    else if (consistencia >= 30) puntos = 5;
    else puntos = 3;

    return {
      puntosConsistencia: puntos,
      consistencia
    };
  }

  /**
   * Calcula puntos por completitud (porcentaje de preguntas respondidas)
   */
  static calcularPuntosCompletitud(mensajesUsuario, mensajesAsistente) {
    const preguntasRealizadas = mensajesAsistente.length;
    const respuestasProporcionadas = mensajesUsuario.length;

    if (preguntasRealizadas === 0) {
      return { puntosCompletitud: 10, completitud: 100 };
    }

    const completitud = Math.min(100, (respuestasProporcionadas / preguntasRealizadas) * 100);

    let puntos = 0;
    if (completitud === 100) puntos = 10;
    else if (completitud >= 75) puntos = 7;
    else if (completitud >= 50) puntos = 5;
    else puntos = 2;

    return {
      puntosCompletitud: puntos,
      completitud
    };
  }

  /**
   * Retorna el multiplicador según la dificultad
   */
  static getMultiplicadorDificultad(dificultad) {
    const multiplicadores = {
      'basica': 1.0,
      'intermedia': 1.1,
      'avanzada': 1.2
    };

    return multiplicadores[dificultad] || 1.0;
  }

  /**
   * Determina el nivel de desempeño basado en la puntuación
   */
  static determinarNivelDesempeno(puntuacion) {
    if (puntuacion >= 90) return 'Excelente';
    if (puntuacion >= 80) return 'Muy Bueno';
    if (puntuacion >= 70) return 'Bueno';
    if (puntuacion >= 60) return 'Satisfactorio';
    if (puntuacion >= 50) return 'Regular';
    return 'Necesita Mejorar';
  }

  /**
   * Genera una puntuación mínima para casos sin respuestas
   */
  static generarPuntuacionMinima() {
    return {
      puntuacion_final: 0,
      nivel_desempeno: 'Sin Evaluar',
      metricas: {
        cantidad_respuestas: 0,
        densidad_promedio_caracteres: 0,
        palabras_promedio: 0,
        consistencia_porcentaje: 0,
        completitud_porcentaje: 0,
        multiplicador_dificultad: 1.0
      },
      desglose_puntos: {
        cantidad: { puntos: 0, peso: '30%', contribucion: 0 },
        densidad: { puntos: 0, peso: '40%', contribucion: 0 },
        consistencia: { puntos: 0, peso: '20%', contribucion: 0 },
        completitud: { puntos: 0, peso: '10%', contribucion: 0 },
        base: 0,
        multiplicador: 1.0
      }
    };
  }

  /**
   * Genera análisis textual de las métricas
   */
  static generarAnalisisMetricas(resultado) {
    const { puntuacion_final, metricas, nivel_desempeno } = resultado;
    const analisis = [];

    // Análisis de cantidad
    if (metricas.cantidad_respuestas >= 8) {
      analisis.push('Excelente participación con múltiples respuestas detalladas');
    } else if (metricas.cantidad_respuestas >= 5) {
      analisis.push('Buena participación, considera ampliar aún más tus respuestas');
    } else if (metricas.cantidad_respuestas >= 3) {
      analisis.push('Participación moderada, intenta responder más preguntas para una evaluación completa');
    } else {
      analisis.push('Participación limitada, se recomienda responder más preguntas en futuras entrevistas');
    }

    // Análisis de densidad
    if (metricas.palabras_promedio >= 50) {
      analisis.push('Respuestas muy detalladas y elaboradas');
    } else if (metricas.palabras_promedio >= 30) {
      analisis.push('Respuestas con buen nivel de detalle');
    } else if (metricas.palabras_promedio >= 15) {
      analisis.push('Respuestas moderadas, considera agregar más ejemplos y detalles');
    } else {
      analisis.push('Respuestas breves, intenta desarrollar más tus ideas con ejemplos concretos');
    }

    // Análisis de consistencia
    if (metricas.consistencia_porcentaje >= 70) {
      analisis.push('Excelente consistencia en la calidad de tus respuestas');
    } else if (metricas.consistencia_porcentaje >= 50) {
      analisis.push('Consistencia aceptable, algunas respuestas varían en detalle');
    } else {
      analisis.push('Se observa variación significativa en el nivel de detalle entre respuestas');
    }

    return {
      resumen: `Tu desempeño fue ${nivel_desempeno} con una puntuación de ${puntuacion_final}/100`,
      puntos_fuertes: analisis.filter((_, i) => i % 2 === 0),
      areas_mejora: analisis.filter((_, i) => i % 2 !== 0)
    };
  }
}

module.exports = ScoringService;
