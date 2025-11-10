/**
 * ScoringService - Sistema de evaluación completo para entrevistas
 *
 * Evalúa 5 dimensiones principales:
 * 1. Comunicación (25%) - Claridad, coherencia, estructura
 * 2. Conocimiento Técnico (30%) - Profundidad, precisión
 * 3. Competencias Blandas (25%) - Actitud, profesionalismo
 * 4. Completitud (10%) - Cantidad y calidad de respuestas
 * 5. Coherencia (10%) - Consistencia en las respuestas
 */

class ScoringService {

  /**
   * Calcula el scoring completo de una entrevista
   * @param {Array} entrevista - Array de mensajes de la entrevista
   * @returns {Object} - Scoring detallado
   */
  static calcularScoring(entrevista) {
    if (!entrevista || entrevista.length === 0) {
      return this.generarScoringVacio();
    }

    // Separar mensajes por tipo
    const preguntasUsuario = entrevista.filter(m => m.tipo === 'usuario' || m.role === 'user');
    const respuestasIA = entrevista.filter(m => m.tipo === 'ia' || m.role === 'assistant');

    if (preguntasUsuario.length === 0) {
      return this.generarScoringVacio();
    }

    // Calcular cada dimensión
    const scoreComunicacion = this.evaluarComunicacion(preguntasUsuario);
    const scoreConocimientoTecnico = this.evaluarConocimientoTecnico(preguntasUsuario, respuestasIA);
    const scoreCompetencias = this.evaluarCompetencias(preguntasUsuario);
    const scoreCompletitud = this.evaluarCompletitud(preguntasUsuario);
    const scoreCoherencia = this.evaluarCoherencia(preguntasUsuario);

    // Calcular puntuación total (ponderada)
    const scoreTotal = Math.round(
      scoreComunicacion * 0.25 +
      scoreConocimientoTecnico * 0.30 +
      scoreCompetencias * 0.25 +
      scoreCompletitud * 0.10 +
      scoreCoherencia * 0.10
    );

    // Determinar nivel
    const nivel = this.determinarNivel(scoreTotal);

    // Generar recomendaciones
    const recomendaciones = this.generarRecomendaciones({
      comunicacion: scoreComunicacion,
      conocimientoTecnico: scoreConocimientoTecnico,
      competencias: scoreCompetencias,
      completitud: scoreCompletitud,
      coherencia: scoreCoherencia
    });

    return {
      scoreTotal,
      nivel,
      completado: true,
      totalPreguntas: preguntasUsuario.length,
      detalles: {
        comunicacion: scoreComunicacion,
        conocimientoTecnico: scoreConocimientoTecnico,
        competencias: scoreCompetencias,
        completitud: scoreCompletitud,
        coherencia: scoreCoherencia
      },
      recomendaciones
    };
  }

  /**
   * Evalúa la comunicación del candidato
   */
  static evaluarComunicacion(preguntas) {
    let score = 0;
    const total = preguntas.length;

    preguntas.forEach(p => {
      const texto = (p.texto || p.content || '').toLowerCase();
      const palabras = texto.trim().split(/\s+/).length;
      const oraciones = texto.split(/[.!?]+/).filter(s => s.trim()).length;

      // Longitud adecuada (0-35 pts)
      if (palabras >= 50) score += 35 / total;
      else if (palabras >= 30) score += 25 / total;
      else if (palabras >= 15) score += 15 / total;
      else score += 5 / total;

      // Estructura (0-35 pts)
      if (oraciones >= 3) score += 35 / total;
      else if (oraciones >= 2) score += 25 / total;
      else score += 10 / total;

      // Uso de conectores (0-30 pts)
      const conectores = ['porque', 'entonces', 'además', 'sin embargo', 'por lo tanto', 'asimismo', 'por ejemplo'];
      const tieneConectores = conectores.some(c => texto.includes(c));
      if (tieneConectores) score += 30 / total;
      else score += 10 / total;
    });

    return Math.min(100, Math.round(score));
  }

  /**
   * Evalúa el conocimiento técnico
   */
  static evaluarConocimientoTecnico(preguntas, respuestasIA) {
    let score = 0;
    const total = preguntas.length;

    preguntas.forEach((p, index) => {
      const texto = (p.texto || p.content || '').toLowerCase();
      const palabras = texto.trim().split(/\s+/).length;

      // Profundidad (0-40 pts)
      if (palabras >= 60) score += 40 / total;
      else if (palabras >= 40) score += 30 / total;
      else if (palabras >= 20) score += 20 / total;
      else score += 10 / total;

      // Términos técnicos (0-35 pts)
      const terminosTecnicos = ['código', 'función', 'variable', 'clase', 'método', 'algoritmo', 'base de datos',
                                'api', 'framework', 'librería', 'componente', 'módulo', 'testing', 'debug',
                                'deployment', 'servidor', 'cliente', 'frontend', 'backend', 'sql'];
      const terminosEncontrados = terminosTecnicos.filter(t => texto.includes(t)).length;
      if (terminosEncontrados >= 3) score += 35 / total;
      else if (terminosEncontrados >= 2) score += 25 / total;
      else if (terminosEncontrados >= 1) score += 15 / total;
      else score += 5 / total;

      // Ejemplos concretos (0-25 pts)
      const tieneEjemplos = texto.includes('ejemplo') || texto.includes('por ejemplo') ||
                            texto.includes('como') || texto.includes('experiencia');
      if (tieneEjemplos) score += 25 / total;
      else score += 10 / total;
    });

    return Math.min(100, Math.round(score));
  }

  /**
   * Evalúa las competencias blandas
   */
  static evaluarCompetencias(preguntas) {
    let score = 0;
    const total = preguntas.length;

    preguntas.forEach(p => {
      const texto = (p.texto || p.content || '').toLowerCase();

      // Proactividad (0-35 pts)
      const palabrasProactividad = ['mejora', 'optimizar', 'aprender', 'desarrollar', 'proyecto', 'iniciativa'];
      const tieneProactividad = palabrasProactividad.some(pal => texto.includes(pal));
      if (tieneProactividad) score += 35 / total;
      else score += 15 / total;

      // Trabajo en equipo (0-35 pts)
      const palabrasEquipo = ['equipo', 'colabor', 'grupo', 'compañero', 'juntos', 'coordinación'];
      const tieneEquipo = palabrasEquipo.some(pal => texto.includes(pal));
      if (tieneEquipo) score += 35 / total;
      else score += 15 / total;

      // Resolución de problemas (0-30 pts)
      const palabrasProblemas = ['problema', 'solución', 'resolver', 'challenge', 'desafío', 'obstáculo'];
      const tieneProblemas = palabrasProblemas.some(pal => texto.includes(pal));
      if (tieneProblemas) score += 30 / total;
      else score += 10 / total;
    });

    return Math.min(100, Math.round(score));
  }

  /**
   * Evalúa la completitud de la entrevista
   */
  static evaluarCompletitud(preguntas) {
    const cantidad = preguntas.length;
    const palabrasTotales = preguntas.reduce((sum, p) => {
      const texto = p.texto || p.content || '';
      return sum + texto.trim().split(/\s+/).length;
    }, 0);
    const palabrasPromedio = palabrasTotales / cantidad;

    let score = 0;

    // Cantidad de respuestas (0-50 pts)
    if (cantidad >= 15) score += 50;
    else if (cantidad >= 10) score += 40;
    else if (cantidad >= 7) score += 30;
    else if (cantidad >= 5) score += 20;
    else score += 10;

    // Profundidad promedio (0-50 pts)
    if (palabrasPromedio >= 40) score += 50;
    else if (palabrasPromedio >= 25) score += 35;
    else if (palabrasPromedio >= 15) score += 20;
    else score += 10;

    return Math.min(100, Math.round(score));
  }

  /**
   * Evalúa la coherencia de las respuestas
   */
  static evaluarCoherencia(preguntas) {
    if (preguntas.length < 2) return 100;

    const longitudes = preguntas.map(p => {
      const texto = p.texto || p.content || '';
      return texto.length;
    });

    const promedio = longitudes.reduce((a, b) => a + b, 0) / longitudes.length;
    const desviacion = Math.sqrt(
      longitudes.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) / longitudes.length
    );

    const coeficienteVariacion = promedio > 0 ? (desviacion / promedio) : 0;

    // Calcular score basado en consistencia
    let score = 100;
    if (coeficienteVariacion > 1.0) score = 50;
    else if (coeficienteVariacion > 0.7) score = 60;
    else if (coeficienteVariacion > 0.5) score = 75;
    else if (coeficienteVariacion > 0.3) score = 85;

    return Math.round(score);
  }

  /**
   * Determina el nivel de desempeño
   */
  static determinarNivel(score) {
    if (score >= 90) return { nombre: 'Excelente', color: '#10b981', descripcion: 'Desempeño sobresaliente' };
    if (score >= 80) return { nombre: 'Muy Bueno', color: '#3b82f6', descripcion: 'Desempeño destacado' };
    if (score >= 70) return { nombre: 'Bueno', color: '#8b5cf6', descripcion: 'Buen desempeño' };
    if (score >= 60) return { nombre: 'Regular', color: '#f59e0b', descripcion: 'Desempeño satisfactorio' };
    if (score >= 50) return { nombre: 'Aceptable', color: '#f97316', descripcion: 'Desempeño aceptable' };
    return { nombre: 'Necesita Mejorar', color: '#ef4444', descripcion: 'Requiere desarrollo' };
  }

  /**
   * Genera recomendaciones personalizadas
   */
  static generarRecomendaciones(scores) {
    const recomendaciones = [];

    // Ordenar dimensiones por score (menor a mayor)
    const dimensiones = [
      { nombre: 'Comunicación', score: scores.comunicacion, categoria: 'comunicacion' },
      { nombre: 'Conocimiento Técnico', score: scores.conocimientoTecnico, categoria: 'tecnico' },
      { nombre: 'Competencias Blandas', score: scores.competencias, categoria: 'competencias' },
      { nombre: 'Completitud', score: scores.completitud, categoria: 'completitud' },
      { nombre: 'Coherencia', score: scores.coherencia, categoria: 'coherencia' }
    ].sort((a, b) => a.score - b.score);

    // Generar recomendaciones para las 3 dimensiones más bajas
    dimensiones.slice(0, 3).forEach((dim, index) => {
      const mensajes = this.obtenerMensajesRecomendacion(dim.categoria, dim.score);
      recomendaciones.push({
        prioridad: index + 1,
        categoria: dim.nombre,
        score: dim.score,
        mensaje: mensajes
      });
    });

    return recomendaciones;
  }

  /**
   * Obtiene mensajes de recomendación según categoría y score
   */
  static obtenerMensajesRecomendacion(categoria, score) {
    const mensajes = {
      comunicacion: score < 70
        ? 'Desarrolla respuestas más estructuradas usando conectores lógicos y ejemplos concretos'
        : 'Mejora la claridad agregando más detalles y contexto a tus respuestas',
      tecnico: score < 70
        ? 'Profundiza en conceptos técnicos específicos y demuestra conocimiento con ejemplos prácticos'
        : 'Amplía tu vocabulario técnico y explica implementaciones con mayor detalle',
      competencias: score < 70
        ? 'Destaca más tus habilidades de trabajo en equipo y resolución de problemas'
        : 'Fortalece ejemplos de liderazgo y toma de decisiones en situaciones complejas',
      completitud: score < 70
        ? 'Responde con mayor profundidad, apuntando a respuestas de 30-50 palabras mínimo'
        : 'Mantén la extensión de tus respuestas pero agrega más ejemplos específicos',
      coherencia: score < 70
        ? 'Mantén un nivel consistente de detalle en todas tus respuestas'
        : 'Asegura que todas las respuestas tengan estructura y profundidad similar'
    };

    return mensajes[categoria] || 'Continúa desarrollando esta área';
  }

  /**
   * Verifica si la entrevista fue finalizada por la IA
   */
  static verificarEntrevistaFinalizada(mensajeIA) {
    const texto = (mensajeIA || '').toLowerCase();
    const frasesFin = [
      'entrevista ha concluido',
      'hemos terminado',
      'finalizado la entrevista',
      'muchas gracias por tu tiempo',
      'fin de la entrevista',
      'entrevista finalizada',
      'eso es todo por hoy',
      'ha sido un placer',
      'termina aquí'
    ];

    return frasesFin.some(frase => texto.includes(frase));
  }

  /**
   * Genera scoring vacío para casos sin datos
   */
  static generarScoringVacio() {
    return {
      scoreTotal: 0,
      nivel: { nombre: 'Sin Evaluar', color: '#9ca3af', descripcion: 'No hay datos suficientes' },
      completado: false,
      totalPreguntas: 0,
      detalles: {
        comunicacion: 0,
        conocimientoTecnico: 0,
        competencias: 0,
        completitud: 0,
        coherencia: 0
      },
      recomendaciones: []
    };
  }
}

module.exports = ScoringService;
