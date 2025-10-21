const { 
  Alumno, 
  CV, 
  Entrevista, 
  RespuestaEntrevista, 
  Habilidad, 
  TipoHabilidad,
  CVHabilidad
} = require("../../database/models");
const utilsService = require("./utils.service");
const logger = require("./logger.service");

class AnalyticsService {

  // 📊 Análisis completo del rendimiento del alumno
  async getStudentAnalytics(alumnoId) {
    try {
      const analytics = {
        resumen: await this.getStudentSummary(alumnoId),
        entrevistas: await this.getInterviewAnalytics(alumnoId),
        cvs: await this.getCVAnalytics(alumnoId),
        habilidades: await this.getSkillsAnalytics(alumnoId),
        progreso: await this.getProgressAnalytics(alumnoId),
        predicciones: await this.getPredictions(alumnoId)
      };

      return {
        success: true,
        data: analytics,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      logger.error("Error generando analytics del estudiante", error, {
        user_id: alumnoId
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 📋 Resumen general del estudiante
  async getStudentSummary(alumnoId) {
    const [alumno, totalCVs, totalEntrevistas, totalInformes] = await Promise.all([
      Alumno.findByPk(alumnoId),
      CV.count({ where: { alumnoId } }),
      Entrevista.count({ where: { alumnoId } }),
      CV.count({ 
        where: { alumnoId },
        include: [{ model: require("../../database/models").Informe, as: 'informes', required: true }]
      })
    ]);

    const diasActivo = Math.floor(
      (Date.now() - new Date(alumno.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      nombre: alumno.nombre,
      email: alumno.correo,
      dias_activo: diasActivo,
      ultimo_acceso: utilsService.timeAgo(alumno.fecha_ultimo_acceso),
      actividad: {
        cvs_subidos: totalCVs,
        entrevistas_realizadas: totalEntrevistas,
        informes_generados: totalInformes,
        nivel_actividad: this.calculateActivityLevel(totalCVs, totalEntrevistas, diasActivo)
      }
    };
  }

  // 🎯 Analytics de entrevistas
  async getInterviewAnalytics(alumnoId) {
    const entrevistas = await Entrevista.findAll({
      where: { 
        alumnoId,
        promedio_puntuacion: { [require('sequelize').Op.not]: null }
      },
      include: [
        {
          model: RespuestaEntrevista,
          as: 'respuestas',
          required: false
        }
      ],
      order: [['fecha', 'DESC']]
    });

    if (entrevistas.length === 0) {
      return {
        total: 0,
        message: "No hay entrevistas completadas"
      };
    }

    const puntuaciones = entrevistas.map(e => e.promedio_puntuacion);
    const stats = utilsService.calculateStats(puntuaciones);

    // Análisis de tendencia temporal
    const tendencia = this.analyzeTrend(
      entrevistas.map(e => ({
        fecha: e.fecha,
        puntuacion: e.promedio_puntuacion
      }))
    );

    // Análisis de mejora por sesión
    const mejoraPorSesion = this.calculateImprovementRate(puntuaciones.reverse());

    // Distribución de resultados
    const distribucion = {
      excepcional: entrevistas.filter(e => e.promedio_puntuacion >= 9).length,
      muy_bueno: entrevistas.filter(e => e.promedio_puntuacion >= 8 && e.promedio_puntuacion < 9).length,
      bueno: entrevistas.filter(e => e.promedio_puntuacion >= 7 && e.promedio_puntuacion < 8).length,
      regular: entrevistas.filter(e => e.promedio_puntuacion >= 6 && e.promedio_puntuacion < 7).length,
      necesita_mejora: entrevistas.filter(e => e.promedio_puntuacion < 6).length
    };

    return {
      total: entrevistas.length,
      estadisticas: stats,
      tendencia: tendencia,
      mejora_por_sesion: mejoraPorSesion,
      distribucion: distribucion,
      nivel_actual: utilsService.getSkillLevel(stats.average),
      consistencia: this.calculateConsistency(puntuaciones),
      tiempo_promedio_por_entrevista: this.calculateAverageInterviewTime(entrevistas)
    };
  }

  // 📄 Analytics de CVs
  async getCVAnalytics(alumnoId) {
    const cvs = await CV.findAll({
      where: { alumnoId },
      include: [
        {
          model: CVHabilidad,
          as: 'cv_habilidades',
          include: [
            {
              model: Habilidad,
              as: 'habilidad',
              include: [{ model: TipoHabilidad, as: 'tipo' }]
            }
          ]
        }
      ]
    });

    const cvsProcessed = cvs.filter(cv => cv.contenido_extraido);
    const totalHabilidades = cvs.reduce((sum, cv) => sum + cv.cv_habilidades.length, 0);

    // Análisis de habilidades más comunes
    const habilidadesFreq = {};
    const tiposFreq = { 'Técnica': 0, 'Blanda': 0 };

    cvs.forEach(cv => {
      cv.cv_habilidades.forEach(cvHab => {
        const habilidad = cvHab.habilidad.habilidad;
        const tipo = cvHab.habilidad.tipo.nombre;
        
        habilidadesFreq[habilidad] = (habilidadesFreq[habilidad] || 0) + 1;
        tiposFreq[tipo]++;
      });
    });

    const topHabilidades = Object.entries(habilidadesFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([habilidad, freq]) => ({ habilidad, frecuencia: freq }));

    return {
      total_cvs: cvs.length,
      procesados: cvsProcessed.length,
      pendientes: cvs.length - cvsProcessed.length,
      total_habilidades: totalHabilidades,
      promedio_habilidades_por_cv: cvs.length > 0 ? (totalHabilidades / cvs.length).toFixed(1) : 0,
      distribucion_tipos: tiposFreq,
      top_habilidades: topHabilidades,
      completitud_promedio: this.calculateAverageCompleteness(cvsProcessed)
    };
  }

  // 🧠 Analytics de habilidades
  async getSkillsAnalytics(alumnoId) {
    const cvs = await CV.findAll({
      where: { alumnoId },
      include: [
        {
          model: CVHabilidad,
          as: 'cv_habilidades',
          include: [
            {
              model: Habilidad,
              as: 'habilidad',
              include: [{ model: TipoHabilidad, as: 'tipo' }]
            }
          ]
        }
      ]
    });

    const habilidadesSet = new Set();
    const categorias = {
      'Técnica': new Set(),
      'Blanda': new Set()
    };

    cvs.forEach(cv => {
      cv.cv_habilidades.forEach(cvHab => {
        const habilidad = cvHab.habilidad.habilidad;
        const tipo = cvHab.habilidad.tipo.nombre;
        
        habilidadesSet.add(habilidad);
        categorias[tipo].add(habilidad);
      });
    });

    return {
      total_unicas: habilidadesSet.size,
      tecnicas: Array.from(categorias['Técnica']),
      blandas: Array.from(categorias['Blanda']),
      balance: {
        tecnicas: categorias['Técnica'].size,
        blandas: categorias['Blanda'].size,
        ratio: categorias['Técnica'].size / (categorias['Blanda'].size || 1)
      },
      recomendacion_balance: this.getSkillBalanceRecommendation(categorias)
    };
  }

  // 📈 Analytics de progreso temporal
  async getProgressAnalytics(alumnoId) {
    const entrevistas = await Entrevista.findAll({
      where: { 
        alumnoId,
        promedio_puntuacion: { [require('sequelize').Op.not]: null }
      },
      order: [['fecha', 'ASC']]
    });

    if (entrevistas.length < 2) {
      return {
        message: "Se necesitan al menos 2 entrevistas para análisis de progreso"
      };
    }

    const progresoPorMes = this.groupByMonth(entrevistas);
    const racha = this.calculateStreak(entrevistas);
    const proyeccion = this.projectFuturePerformance(entrevistas);

    return {
      progreso_mensual: progresoPorMes,
      racha_actual: racha,
      proyeccion_3_meses: proyeccion,
      velocidad_mejora: this.calculateImprovementVelocity(entrevistas)
    };
  }

  // 🔮 Predicciones y recomendaciones
  async getPredictions(alumnoId) {
    const [entrevistas, cvs] = await Promise.all([
      Entrevista.findAll({
        where: { 
          alumnoId,
          promedio_puntuacion: { [require('sequelize').Op.not]: null }
        },
        order: [['fecha', 'DESC']],
        limit: 10
      }),
      CV.count({ where: { alumnoId } })
    ]);

    const predicciones = {
      ready_for_real_interviews: false,
      estimated_success_rate: 0,
      recommended_focus_areas: [],
      next_milestone: null,
      confidence_level: "bajo"
    };

    if (entrevistas.length > 0) {
      const promedioActual = utilsService.calculateStats(
        entrevistas.map(e => e.promedio_puntuacion)
      ).average;

      predicciones.ready_for_real_interviews = promedioActual >= 7.5;
      predicciones.estimated_success_rate = Math.min(95, Math.max(10, (promedioActual - 3) * 20));
      
      if (promedioActual < 6) {
        predicciones.recommended_focus_areas = ["Técnicas básicas de entrevista", "Confianza personal"];
        predicciones.next_milestone = "Alcanzar promedio de 6.0";
        predicciones.confidence_level = "bajo";
      } else if (promedioActual < 7.5) {
        predicciones.recommended_focus_areas = ["Ejemplos específicos", "Storytelling"];
        predicciones.next_milestone = "Alcanzar promedio de 7.5";
        predicciones.confidence_level = "medio";
      } else {
        predicciones.recommended_focus_areas = ["Preguntas desafiantes", "Liderazgo"];
        predicciones.next_milestone = "Mantener excelencia";
        predicciones.confidence_level = "alto";
      }
    }

    return predicciones;
  }

  // 🔧 Métodos auxiliares

  calculateActivityLevel(cvs, entrevistas, dias) {
    const score = (cvs * 2 + entrevistas * 3) / Math.max(dias, 1);
    if (score > 0.5) return "muy_activo";
    if (score > 0.2) return "activo";
    if (score > 0.05) return "moderado";
    return "bajo";
  }

  analyzeTrend(data) {
    if (data.length < 3) return "insuficiente_data";
    
    const recientes = data.slice(0, Math.ceil(data.length / 3));
    const anteriores = data.slice(-Math.ceil(data.length / 3));
    
    const promedioReciente = recientes.reduce((sum, d) => sum + d.puntuacion, 0) / recientes.length;
    const promedioAnterior = anteriores.reduce((sum, d) => sum + d.puntuacion, 0) / anteriores.length;
    
    const diferencia = promedioReciente - promedioAnterior;
    
    if (diferencia > 0.5) return "mejorando";
    if (diferencia < -0.5) return "declinando";
    return "estable";
  }

  calculateImprovementRate(puntuaciones) {
    if (puntuaciones.length < 2) return 0;
    
    const primera = puntuaciones[0];
    const ultima = puntuaciones[puntuaciones.length - 1];
    
    return ((ultima - primera) / puntuaciones.length).toFixed(2);
  }

  calculateConsistency(puntuaciones) {
    const stats = utilsService.calculateStats(puntuaciones);
    const coefVariacion = (Math.sqrt(
      puntuaciones.reduce((sum, p) => sum + Math.pow(p - stats.average, 2), 0) / puntuaciones.length
    ) / stats.average) * 100;
    
    if (coefVariacion < 10) return "muy_alta";
    if (coefVariacion < 20) return "alta";
    if (coefVariacion < 30) return "media";
    return "baja";
  }

  calculateAverageInterviewTime(entrevistas) {
    // Placeholder - en una implementación real calcularíamos el tiempo real
    return "15-20 minutos"; // Estimación basada en número de respuestas
  }

  calculateAverageCompleteness(cvs) {
    if (cvs.length === 0) return 0;
    
    // Simulamos un score de completitud basado en contenido extraído
    const scores = cvs.map(cv => {
      const length = cv.contenido_extraido ? cv.contenido_extraido.length : 0;
      return Math.min(100, Math.max(0, (length / 1000) * 100)); // Score basado en longitud
    });
    
    return utilsService.calculateStats(scores).average.toFixed(1);
  }

  getSkillBalanceRecommendation(categorias) {
    const tecnicas = categorias['Técnica'].size;
    const blandas = categorias['Blanda'].size;
    const ratio = tecnicas / (blandas || 1);
    
    if (ratio > 3) return "Desarrollar más habilidades blandas";
    if (ratio < 0.5) return "Desarrollar más habilidades técnicas";
    return "Balance adecuado de habilidades";
  }

  groupByMonth(entrevistas) {
    const grupos = {};
    
    entrevistas.forEach(e => {
      const mes = new Date(e.fecha).toISOString().slice(0, 7); // YYYY-MM
      if (!grupos[mes]) grupos[mes] = [];
      grupos[mes].push(e.promedio_puntuacion);
    });
    
    return Object.entries(grupos).map(([mes, puntuaciones]) => ({
      mes,
      promedio: utilsService.calculateStats(puntuaciones).average.toFixed(2),
      total_entrevistas: puntuaciones.length
    }));
  }

  calculateStreak(entrevistas) {
    // Calcular racha de mejora continua
    let racha = 0;
    for (let i = 1; i < entrevistas.length; i++) {
      if (entrevistas[i].promedio_puntuacion >= entrevistas[i-1].promedio_puntuacion) {
        racha++;
      } else {
        break;
      }
    }
    return racha;
  }

  projectFuturePerformance(entrevistas) {
    const recientes = entrevistas.slice(-5).map(e => e.promedio_puntuacion);
    const tendencia = this.calculateImprovementRate(recientes);
    const actual = recientes[recientes.length - 1];
    
    return {
      proyeccion: Math.min(10, Math.max(1, actual + (tendencia * 10))).toFixed(1),
      confianza: recientes.length >= 5 ? "alta" : "media"
    };
  }

  calculateImprovementVelocity(entrevistas) {
    if (entrevistas.length < 3) return "datos_insuficientes";
    
    const puntuaciones = entrevistas.map(e => e.promedio_puntuacion);
    const mejoras = [];
    
    for (let i = 1; i < puntuaciones.length; i++) {
      mejoras.push(puntuaciones[i] - puntuaciones[i-1]);
    }
    
    const promedioMejora = mejoras.reduce((a, b) => a + b, 0) / mejoras.length;
    
    if (promedioMejora > 0.3) return "muy_rapida";
    if (promedioMejora > 0.1) return "rapida";
    if (promedioMejora > -0.1) return "estable";
    return "lenta";
  }
}

// Singleton instance
const analyticsService = new AnalyticsService();

module.exports = analyticsService;