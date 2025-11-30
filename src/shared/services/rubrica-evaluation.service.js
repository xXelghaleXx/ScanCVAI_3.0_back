/**
 * RubricaEvaluationService - Sistema de evaluación basado en la rúbrica oficial de TECSUP
 *
 * Eval úa tanto CVs como entrevistas usando los 6 criterios de la rúbrica:
 * 1. Perfil Profesional (15 pts)
 * 2. Formato TECSUP (20 pts)
 * 3. Experiencia Académica (20 pts)
 * 4. Experiencia Laboral (20 pts)
 * 5. Certificaciones (15 pts)
 * 6. Información Adicional (10 pts)
 *
 * Total: 100 puntos
 */

class RubricaEvaluationService {

  /**
   * Estructura de la rúbrica oficial
   */
  static RUBRICA = {
    criterios: {
      perfil_profesional: {
        peso: 15,
        niveles: {
          excelente: { min: 13, max: 15, descripcion: '4-5 líneas perfectas con marca personal y valor añadido' },
          bueno: { min: 10, max: 12, descripcion: 'Estructura correcta, falta refinamiento menor' },
          regular: { min: 7, max: 9, descripcion: 'Muy extenso/corto, información irrelevante' },
          deficiente: { min: 0, max: 6, descripcion: 'No existe o errores graves' }
        }
      },
      formato_tecsup: {
        peso: 20,
        niveles: {
          excelente: { min: 18, max: 20, descripcion: 'Formato perfecto, tipografía correcta, bien organizado' },
          bueno: { min: 14, max: 17, descripcion: 'Sigue formato con errores menores' },
          regular: { min: 10, max: 13, descripcion: 'Faltan secciones importantes' },
          deficiente: { min: 0, max: 9, descripcion: 'No sigue formato institucional' }
        }
      },
      experiencia_academica: {
        peso: 20,
        niveles: {
          excelente: { min: 18, max: 20, descripcion: '3+ proyectos detallados con resultados cuantificables' },
          bueno: { min: 14, max: 17, descripcion: '2 proyectos bien documentados' },
          regular: { min: 10, max: 13, descripcion: '1-2 proyectos sin suficiente detalle' },
          deficiente: { min: 0, max: 9, descripcion: 'No presenta proyectos académicos' }
        }
      },
      experiencia_laboral: {
        peso: 20,
        niveles: {
          excelente: { min: 13, max: 15, descripcion: 'Experiencia relevante con logros cuantificables' },
          bueno: { min: 10, max: 12, descripcion: 'Prácticas o trabajos de medio tiempo' },
          regular: { min: 7, max: 9, descripcion: 'Experiencia no relacionada a la carrera' },
          deficiente: { min: 0, max: 6, descripcion: 'Sin experiencia laboral relevante' }
        }
      },
      certificaciones: {
        peso: 15,
        niveles: {
          excelente: { min: 13, max: 15, descripcion: '3+ certificaciones validadas y relevantes' },
          bueno: { min: 10, max: 12, descripcion: '2 certificaciones validadas' },
          regular: { min: 7, max: 9, descripcion: '1 certificación validada' },
          deficiente: { min: 0, max: 6, descripcion: 'Sin certificaciones validadas' }
        }
      },
      informacion_adicional: {
        peso: 10,
        niveles: {
          excelente: { min: 9, max: 10, descripcion: 'Idiomas, voluntariado, liderazgo, desarrollo continuo' },
          bueno: { min: 7, max: 8, descripcion: '2+ elementos adicionales relevantes' },
          regular: { min: 5, max: 6, descripcion: '1 elemento adicional básico' },
          deficiente: { min: 0, max: 4, descripcion: 'Sección vacía o irrelevante' }
        }
      }
    },
    niveles_desempenio: {
      excelente: { min: 90, max: 100, color: '#10b981' },
      bueno: { min: 75, max: 89, color: '#3b82f6' },
      regular: { min: 60, max: 74, color: '#f59e0b' },
      deficiente: { min: 0, max: 59, color: '#ef4444' }
    }
  };

  /**
   * Evalúa un CV completo basado en la rúbrica
   * @param {Object} validation - Datos de validación del CV
   * @param {Object} analisis - Análisis de IA del CV
   * @param {Object} stats - Estadísticas del CV
   * @returns {Object} - Evaluación completa según rúbrica
   */
  static evaluarCV(validation, analisis, stats) {
    if (!validation || !analisis) {
      return this.generarEvaluacionVacia();
    }

    const criterios = {};

    // 1. Evaluar Perfil Profesional (15 pts)
    criterios.perfil_profesional = this.evaluarPerfilProfesional(analisis, stats);

    // 2. Evaluar Formato TECSUP (20 pts)
    criterios.formato_tecsup = this.evaluarFormatoTECSUP(validation, stats);

    // 3. Evaluar Experiencia Académica (20 pts)
    criterios.experiencia_academica = this.evaluarExperienciaAcademica(analisis);

    // 4. Evaluar Experiencia Laboral (20 pts)
    criterios.experiencia_laboral = this.evaluarExperienciaLaboral(analisis);

    // 5. Evaluar Certificaciones (15 pts)
    criterios.certificaciones = this.evaluarCertificaciones(analisis);

    // 6. Evaluar Información Adicional (15 pts)
    criterios.informacion_adicional = this.evaluarInformacionAdicional(analisis);

    // Calcular puntuación total
    const puntuacion_total = Object.values(criterios).reduce((sum, crit) => sum + crit.puntos, 0);

    // Determinar nivel de desempeño
    const nivel_desempenio = this.determinarNivelDesempenio(puntuacion_total);

    // Generar fortalezas y áreas de mejora
    const { fortalezas, areas_mejora } = this.generarAnalisisRubrica(criterios);

    return {
      puntuacion_total: Math.round(puntuacion_total),
      nivel_desempenio,
      criterios,
      fortalezas,
      areas_mejora,
      comentario_final: this.generarComentarioFinal(puntuacion_total, nivel_desempenio)
    };
  }

  /**
   * Evalúa una entrevista basada en la rúbrica (adaptada para entrevistas)
   * @param {Array} mensajes - Mensajes de la entrevista
   * @param {Object} metadatos - Metadatos de la entrevista (carrera, dificultad, etc.)
   * @returns {Object} - Evaluación completa según rúbrica
   */
  static evaluarEntrevista(mensajes, metadatos = {}) {
    if (!mensajes || mensajes.length === 0) {
      return this.generarEvaluacionVacia();
    }

    // Filtrar mensajes del usuario
    const respuestasUsuario = mensajes.filter(m => m.tipo === 'usuario' || m.role === 'user');

    if (respuestasUsuario.length === 0) {
      return this.generarEvaluacionVacia();
    }

    const criterios = {};

    // 1. Perfil Profesional → Comunicación y Presentación (15 pts)
    criterios.perfil_profesional = this.evaluarComunicacionEntrevista(respuestasUsuario);

    // 2. Formato TECSUP → Estructura de Respuestas (20 pts)
    criterios.formato_tecsup = this.evaluarEstructuraRespuestas(respuestasUsuario);

    // 3. Experiencia Académica → Conocimientos Técnicos (20 pts)
    criterios.experiencia_academica = this.evaluarConocimientosTecnicos(respuestasUsuario);

    // 4. Experiencia Laboral → Ejemplos Prácticos (20 pts)
    criterios.experiencia_laboral = this.evaluarEjemplosPracticos(respuestasUsuario);

    // 5. Certificaciones → Competencias Demostradas (15 pts)
    criterios.certificaciones = this.evaluarCompetenciasDemostradas(respuestasUsuario);

    // 6. Información Adicional → Completitud y Coherencia (15 pts)
    criterios.informacion_adicional = this.evaluarCompletitudCoherencia(respuestasUsuario);

    // Calcular puntuación total
    const puntuacion_total = Object.values(criterios).reduce((sum, crit) => sum + crit.puntos, 0);

    // Determinar nivel de desempeño
    const nivel_desempenio = this.determinarNivelDesempenio(puntuacion_total);

    // Generar fortalezas y áreas de mejora
    const { fortalezas, areas_mejora } = this.generarAnalisisRubrica(criterios);

    return {
      puntuacion_total: Math.round(puntuacion_total),
      nivel_desempenio,
      criterios,
      fortalezas,
      areas_mejora,
      comentario_final: this.generarComentarioFinal(puntuacion_total, nivel_desempenio),
      total_preguntas: respuestasUsuario.length
    };
  }

  // ==================== EVALUACIÓN DE CV ====================

  /**
   * Evalúa el perfil profesional del CV
   */
  static evaluarPerfilProfesional(analisis, stats) {
    let puntos = 0;
    const peso = this.RUBRICA.criterios.perfil_profesional.peso;

    // Verificar si tiene perfil/resumen
    const tienePerfil = analisis.perfil_profesional || analisis.resumen_profesional || analisis.objetivo;

    if (!tienePerfil) {
      return this.crearResultadoCriterio('deficiente', peso, 'No se encontró perfil profesional');
    }

    const palabrasPerfil = (tienePerfil?.toString() || '').split(/\s+/).length;
    const lineas = (tienePerfil?.toString() || '').split('\n').length;

    // Evaluar extensión y calidad
    if (palabrasPerfil >= 40 && palabrasPerfil <= 80 && lineas >= 4) {
      puntos = 15; // Excelente - Máximo del peso
    } else if (palabrasPerfil >= 30 && palabrasPerfil <= 100) {
      puntos = 11; // Bueno
    } else if (palabrasPerfil >= 15) {
      puntos = 8; // Regular
    } else {
      puntos = 4; // Deficiente
    }

    const nivel = this.determinarNivelCriterio(puntos, this.RUBRICA.criterios.perfil_profesional);
    return {
      nombre: 'Perfil Profesional',
      puntos: Math.min(peso, puntos),
      peso,
      nivel,
      observacion: `${palabrasPerfil} palabras, ${lineas} líneas`
    };
  }

  /**
   * Evalúa el formato TECSUP del CV
   */
  static evaluarFormatoTECSUP(validation, stats) {
    let puntos = 0;
    const peso = this.RUBRICA.criterios.formato_tecsup.peso;

    const { requiredFields } = validation;

    // Contar secciones presentes
    const seccionesRequeridas = ['tiene_nombre', 'tiene_contacto', 'tiene_experiencia', 'tiene_educacion', 'tiene_habilidades'];
    const seccionesPresentes = seccionesRequeridas.filter(campo => requiredFields?.[campo]).length;

    // Evaluar formato
    if (seccionesPresentes === 5 && stats.pageCount <= 2) {
      puntos = 20; // Excelente - Máximo del peso
    } else if (seccionesPresentes >= 4) {
      puntos = 15; // Bueno
    } else if (seccionesPresentes >= 3) {
      puntos = 11; // Regular
    } else {
      puntos = 6; // Deficiente
    }

    const nivel = this.determinarNivelCriterio(puntos, this.RUBRICA.criterios.formato_tecsup);
    return {
      nombre: 'Formato TECSUP',
      puntos: Math.min(peso, puntos),
      peso,
      nivel,
      observacion: `${seccionesPresentes}/5 secciones presentes`
    };
  }

  /**
   * Evalúa la experiencia académica
   */
  static evaluarExperienciaAcademica(analisis) {
    let puntos = 0;
    const peso = this.RUBRICA.criterios.experiencia_academica.peso;

    const proyectos = analisis.proyectos || analisis.experiencia_academica || [];
    const numProyectos = Array.isArray(proyectos) ? proyectos.length : 0;

    if (numProyectos >= 3) {
      puntos = 20; // Excelente - Máximo del peso
    } else if (numProyectos === 2) {
      puntos = 15; // Bueno
    } else if (numProyectos === 1) {
      puntos = 11; // Regular
    } else {
      puntos = 5; // Deficiente
    }

    const nivel = this.determinarNivelCriterio(puntos, this.RUBRICA.criterios.experiencia_academica);
    return {
      nombre: 'Experiencia Académica',
      puntos: Math.min(peso, puntos),
      peso,
      nivel,
      observacion: `${numProyectos} proyecto(s) académico(s)`
    };
  }

  /**
   * Evalúa la experiencia laboral
   */
  static evaluarExperienciaLaboral(analisis) {
    let puntos = 0;
    const peso = this.RUBRICA.criterios.experiencia_laboral.peso;

    const experiencias = analisis.experiencia_laboral || analisis.experiencia || [];
    const numExperiencias = Array.isArray(experiencias) ? experiencias.length : 0;

    if (numExperiencias >= 3) {
      puntos = 20; // Excelente - Máximo del peso (CORREGIDO de 14 a 20)
    } else if (numExperiencias === 2) {
      puntos = 15; // Bueno
    } else if (numExperiencias === 1) {
      puntos = 10; // Regular
    } else {
      puntos = 3; // Deficiente
    }

    const nivel = this.determinarNivelCriterio(puntos, this.RUBRICA.criterios.experiencia_laboral);
    return {
      nombre: 'Experiencia Laboral',
      puntos: Math.min(peso, puntos),
      peso,
      nivel,
      observacion: `${numExperiencias} experiencia(s) laboral(es)`
    };
  }

  /**
   * Evalúa las certificaciones
   */
  static evaluarCertificaciones(analisis) {
    let puntos = 0;
    const peso = this.RUBRICA.criterios.certificaciones.peso;

    const certificaciones = analisis.certificaciones || analisis.cursos || [];
    const numCertificaciones = Array.isArray(certificaciones) ? certificaciones.length : 0;

    if (numCertificaciones >= 3) {
      puntos = 15; // Excelente - Máximo del peso
    } else if (numCertificaciones === 2) {
      puntos = 11; // Bueno
    } else if (numCertificaciones === 1) {
      puntos = 8; // Regular
    } else {
      puntos = 3; // Deficiente
    }

    const nivel = this.determinarNivelCriterio(puntos, this.RUBRICA.criterios.certificaciones);
    return {
      nombre: 'Certificaciones',
      puntos: Math.min(peso, puntos),
      peso,
      nivel,
      observacion: `${numCertificaciones} certificación(es)`
    };
  }

  /**
   * Evalúa información adicional
   */
  static evaluarInformacionAdicional(analisis) {
    let puntos = 0;
    const peso = this.RUBRICA.criterios.informacion_adicional.peso;

    let elementos = 0;
    if (analisis.idiomas && analisis.idiomas.length > 0) elementos++;
    if (analisis.habilidades_blandas && analisis.habilidades_blandas.length > 0) elementos++;
    if (analisis.intereses || analisis.hobbies) elementos++;
    if (analisis.voluntariado || analisis.actividades_extracurriculares) elementos++;

    if (elementos >= 4) {
      puntos = 10; // Excelente - Máximo del peso (corregido de 15 a 10)
    } else if (elementos >= 2) {
      puntos = 7; // Bueno
    } else if (elementos === 1) {
      puntos = 5; // Regular
    } else {
      puntos = 2; // Deficiente
    }

    const nivel = this.determinarNivelCriterio(puntos, this.RUBRICA.criterios.informacion_adicional);
    return {
      nombre: 'Información Adicional',
      puntos: Math.min(peso, puntos),
      peso,
      nivel,
      observacion: `${elementos} elemento(s) adicional(es)`
    };
  }

  // ==================== EVALUACIÓN DE ENTREVISTAS ====================

  /**
   * Evalúa comunicación en entrevista (equivalente a Perfil Profesional)
   */
  static evaluarComunicacionEntrevista(respuestas) {
    let puntos = 0;
    const peso = 15;
    const total = respuestas.length;

    respuestas.forEach(r => {
      const texto = (r.texto || r.content || '').toLowerCase();
      const palabras = texto.trim().split(/\s+/).length;
      const oraciones = texto.split(/[.!?]+/).filter(s => s.trim()).length;

      if (palabras >= 40 && oraciones >= 3) {
        puntos += 3.5 / total;
      } else if (palabras >= 25 && oraciones >= 2) {
        puntos += 2.5 / total;
      } else if (palabras >= 15) {
        puntos += 1.5 / total;
      } else {
        puntos += 0.5 / total;
      }
    });

    puntos = Math.min(peso, Math.round(puntos * total));

    const nivel = this.determinarNivelCriterio(puntos, this.RUBRICA.criterios.perfil_profesional);
    return {
      nombre: 'Comunicación y Presentación',
      puntos,
      peso,
      nivel,
      observacion: `Promedio ${Math.round(respuestas.reduce((sum, r) => sum + (r.texto || r.content || '').split(/\s+/).length, 0) / total)} palabras por respuesta`
    };
  }

  /**
   * Evalúa estructura de respuestas (equivalente a Formato TECSUP)
   */
  static evaluarEstructuraRespuestas(respuestas) {
    let puntos = 0;
    const peso = 20;
    const total = respuestas.length;

    respuestas.forEach(r => {
      const texto = (r.texto || r.content || '').toLowerCase();
      const conectores = ['porque', 'entonces', 'además', 'sin embargo', 'por lo tanto', 'por ejemplo', 'asimismo'];
      const tieneConectores = conectores.some(c => texto.includes(c));
      const oraciones = texto.split(/[.!?]+/).filter(s => s.trim()).length;

      if (tieneConectores && oraciones >= 2) {
        puntos += 5 / total;
      } else if (tieneConectores || oraciones >= 2) {
        puntos += 3 / total;
      } else {
        puntos += 1 / total;
      }
    });

    puntos = Math.min(peso, Math.round(puntos * total));

    const nivel = this.determinarNivelCriterio(puntos, this.RUBRICA.criterios.formato_tecsup);
    return {
      nombre: 'Estructura de Respuestas',
      puntos,
      peso,
      nivel,
      observacion: `${respuestas.length} respuestas evaluadas`
    };
  }

  /**
   * Evalúa conocimientos técnicos (equivalente a Experiencia Académica)
   */
  static evaluarConocimientosTecnicos(respuestas) {
    let puntos = 0;
    const peso = 20;
    const total = respuestas.length;

    const terminosTecnicos = ['código', 'función', 'variable', 'clase', 'método', 'algoritmo', 'base de datos',
      'api', 'framework', 'librería', 'componente', 'módulo', 'testing', 'debug',
      'deployment', 'servidor', 'cliente', 'frontend', 'backend', 'sql', 'react', 'node'];

    respuestas.forEach(r => {
      const texto = (r.texto || r.content || '').toLowerCase();
      const terminosEncontrados = terminosTecnicos.filter(t => texto.includes(t)).length;

      if (terminosEncontrados >= 3) {
        puntos += 5 / total;
      } else if (terminosEncontrados >= 2) {
        puntos += 3 / total;
      } else if (terminosEncontrados >= 1) {
        puntos += 2 / total;
      } else {
        puntos += 0.5 / total;
      }
    });

    puntos = Math.min(peso, Math.round(puntos * total));

    const nivel = this.determinarNivelCriterio(puntos, this.RUBRICA.criterios.experiencia_academica);
    return {
      nombre: 'Conocimientos Técnicos',
      puntos,
      peso,
      nivel,
      observacion: `Términos técnicos demostrados`
    };
  }

  /**
   * Evalúa ejemplos prácticos (equivalente a Experiencia Laboral)
   */
  static evaluarEjemplosPracticos(respuestas) {
    let puntos = 0;
    const peso = 20;
    const total = respuestas.length;

    respuestas.forEach(r => {
      const texto = (r.texto || r.content || '').toLowerCase();
      const tieneEjemplos = texto.includes('ejemplo') || texto.includes('por ejemplo') ||
        texto.includes('experiencia') || texto.includes('proyecto') ||
        texto.includes('implementé') || texto.includes('desarrollé');

      if (tieneEjemplos) {
        puntos += 4 / total;
      } else {
        puntos += 1 / total;
      }
    });

    puntos = Math.min(peso, Math.round(puntos * total));

    const nivel = this.determinarNivelCriterio(puntos, this.RUBRICA.criterios.experiencia_laboral);
    return {
      nombre: 'Ejemplos Prácticos',
      puntos,
      peso,
      nivel,
      observacion: `Uso de ejemplos concretos`
    };
  }

  /**
   * Evalúa competencias demostradas (equivalente a Certificaciones)
   */
  static evaluarCompetenciasDemostradas(respuestas) {
    let puntos = 0;
    const peso = 15;
    const total = respuestas.length;

    const palabrasCompetencias = ['equipo', 'colabor', 'liderazgo', 'resolver', 'problem', 'solución',
      'comunicación', 'organización', 'planificación', 'creatividad'];

    respuestas.forEach(r => {
      const texto = (r.texto || r.content || '').toLowerCase();
      const competenciasEncontradas = palabrasCompetencias.filter(p => texto.includes(p)).length;

      if (competenciasEncontradas >= 2) {
        puntos += 3.5 / total;
      } else if (competenciasEncontradas >= 1) {
        puntos += 2 / total;
      } else {
        puntos += 0.5 / total;
      }
    });

    puntos = Math.min(peso, Math.round(puntos * total));

    const nivel = this.determinarNivelCriterio(puntos, this.RUBRICA.criterios.certificaciones);
    return {
      nombre: 'Competencias Demostradas',
      puntos,
      peso,
      nivel,
      observacion: `Habilidades blandas identificadas`
    };
  }

  /**
   * Evalúa completitud y coherencia (equivalente a Información Adicional)
   */
  static evaluarCompletitudCoherencia(respuestas) {
    let puntos = 0;
    const peso = 15;
    const cantidad = respuestas.length;

    // Evaluar cantidad de respuestas
    if (cantidad >= 15) {
      puntos += 8;
    } else if (cantidad >= 10) {
      puntos += 6;
    } else if (cantidad >= 7) {
      puntos += 4;
    } else {
      puntos += 2;
    }

    // Evaluar coherencia (consistencia de longitud)
    const longitudes = respuestas.map(r => (r.texto || r.content || '').length);
    const promedio = longitudes.reduce((a, b) => a + b, 0) / longitudes.length;
    const desviacion = Math.sqrt(
      longitudes.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) / longitudes.length
    );
    const coeficienteVariacion = promedio > 0 ? (desviacion / promedio) : 1;

    if (coeficienteVariacion <= 0.3) {
      puntos += 7;
    } else if (coeficienteVariacion <= 0.5) {
      puntos += 5;
    } else if (coeficienteVariacion <= 0.7) {
      puntos += 3;
    } else {
      puntos += 1;
    }

    puntos = Math.min(peso, Math.round(puntos));

    const nivel = this.determinarNivelCriterio(puntos, this.RUBRICA.criterios.informacion_adicional);
    return {
      nombre: 'Completitud y Coherencia',
      puntos,
      peso,
      nivel,
      observacion: `${cantidad} respuestas, consistencia ${coeficienteVariacion <= 0.5 ? 'alta' : 'moderada'}`
    };
  }

  // ==================== UTILIDADES ====================

  /**
   * Determina el nivel de un criterio según sus puntos
   */
  static determinarNivelCriterio(puntos, criterioRubrica) {
    const niveles = criterioRubrica.niveles;

    if (puntos >= niveles.excelente.min) return 'excelente';
    if (puntos >= niveles.bueno.min) return 'bueno';
    if (puntos >= niveles.regular.min) return 'regular';
    return 'deficiente';
  }

  /**
   * Crea un resultado de criterio con estructura uniforme
   */
  static crearResultadoCriterio(nivel, peso, observacion) {
    const rangos = this.RUBRICA.criterios.perfil_profesional.niveles[nivel];
    const puntos = Math.round((rangos.min + rangos.max) / 2);

    return {
      puntos: Math.min(peso, puntos),
      peso,
      nivel,
      observacion
    };
  }

  /**
   * Determina el nivel de desempeño global
   */
  static determinarNivelDesempenio(puntuacion) {
    const niveles = this.RUBRICA.niveles_desempenio;

    if (puntuacion >= niveles.excelente.min) {
      return { nombre: 'Excelente', color: niveles.excelente.color };
    }
    if (puntuacion >= niveles.bueno.min) {
      return { nombre: 'Bueno', color: niveles.bueno.color };
    }
    if (puntuacion >= niveles.regular.min) {
      return { nombre: 'Regular', color: niveles.regular.color };
    }
    return { nombre: 'Deficiente', color: niveles.deficiente.color };
  }

  /**
   * Genera análisis de fortalezas y áreas de mejora
   */
  static generarAnalisisRubrica(criterios) {
    const fortalezas = [];
    const areas_mejora = [];

    Object.entries(criterios).forEach(([key, criterio]) => {
      if (criterio.nivel === 'excelente') {
        fortalezas.push(`${criterio.nombre}: ${criterio.observacion}`);
      } else if (criterio.nivel === 'deficiente' || criterio.nivel === 'regular') {
        areas_mejora.push(`${criterio.nombre}: ${criterio.observacion}`);
      }
    });

    return { fortalezas, areas_mejora };
  }

  /**
   * Genera comentario final
   */
  static generarComentarioFinal(puntuacion, nivel) {
    if (puntuacion >= 90) {
      return 'Excelente trabajo. Has demostrado un dominio sobresaliente en todos los criterios evaluados.';
    } else if (puntuacion >= 75) {
      return 'Buen desempeño. Cumples con los estándares esperados, con algunos puntos destacables.';
    } else if (puntuacion >= 60) {
      return 'Desempeño regular. Hay aspectos sólidos, pero se identifican áreas importantes de mejora.';
    } else {
      return 'Se requiere desarrollo significativo. Revisa las áreas de mejora y trabaja en fortalecer tus competencias.';
    }
  }

  /**
   * Genera evaluación vacía
   */
  static generarEvaluacionVacia() {
    return {
      puntuacion_total: 0,
      nivel_desempenio: { nombre: 'Sin Evaluar', color: '#9ca3af' },
      criterios: {},
      fortalezas: [],
      areas_mejora: [],
      comentario_final: 'No hay datos suficientes para evaluar'
    };
  }
}

module.exports = RubricaEvaluationService;
