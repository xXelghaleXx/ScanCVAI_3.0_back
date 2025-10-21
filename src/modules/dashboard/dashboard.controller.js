const { 
  Alumno, 
  CV, 
  Informe, 
  Entrevista, 
  RespuestaEntrevista,
  HistorialEntrevista
} = require("../../database/models");
const utilsService = require("../../shared/services/utils.service");
const logger = require("../../shared/services/logger.service");
const analyticsService = require("../../shared/services/analytics.service");

class DashboardController {

  // 📊 RF-108: Dashboard principal del alumno
  static async obtenerDashboard(req, res) {
    try {
      const alumnoId = req.user.id;

      // Datos del alumno
      const alumno = await Alumno.findByPk(alumnoId, {
        attributes: ['nombre', 'correo', 'fecha_ultimo_acceso']
      });

      // Estadísticas de CVs
      const totalCVs = await CV.count({
        where: { alumnoId }
      });

      const cvsRecientes = await CV.findAll({
        where: { alumnoId },
        limit: 3,
        order: [['fecha_creacion', 'DESC']],
        attributes: ['id', 'archivo', 'fecha_creacion', 'contenido_extraido']
      });

      // Estadísticas de informes
      const totalInformes = await Informe.count({
        include: [
          {
            model: CV,
            as: 'cv',
            where: { alumnoId }
          }
        ]
      });

      const informesRecientes = await Informe.findAll({
        include: [
          {
            model: CV,
            as: 'cv',
            where: { alumnoId },
            attributes: ['archivo']
          }
        ],
        limit: 3,
        order: [['fecha_generacion', 'DESC']],
        attributes: ['id', 'resumen', 'fecha_generacion']
      });

      // Estadísticas de entrevistas
      const totalEntrevistas = await Entrevista.count({
        where: { alumnoId }
      });

      const entrevistasRecientes = await Entrevista.findAll({
        where: { alumnoId },
        limit: 3,
        order: [['fecha', 'DESC']],
        attributes: ['id', 'fecha', 'promedio_puntuacion', 'resultado_final']
      });

      // Último resultado de entrevista
      const ultimaEntrevista = await Entrevista.findOne({
        where: { 
          alumnoId,
          resultado_final: { [require('sequelize').Op.not]: null }
        },
        order: [['fecha', 'DESC']],
        attributes: ['promedio_puntuacion', 'resultado_final', 'fecha']
      });

      // Progreso general
      const cvsConInforme = await CV.count({
        where: { alumnoId },
        include: [
          {
            model: Informe,
            as: 'informes',
            required: true
          }
        ]
      });

      const progresoAnalisis = totalCVs > 0 ? Math.round((cvsConInforme / totalCVs) * 100) : 0;

      res.json({
        dashboard: {
          alumno: {
            nombre: alumno.nombre,
            correo: alumno.correo,
            ultimo_acceso: alumno.fecha_ultimo_acceso
          },
          resumen: {
            total_cvs: totalCVs,
            total_informes: totalInformes,
            total_entrevistas: totalEntrevistas,
            progreso_analisis: progresoAnalisis
          },
          cvs_recientes: cvsRecientes.map(cv => ({
            id: cv.id,
            archivo: cv.archivo,
            fecha: cv.fecha_creacion,
            procesado: !!cv.contenido_extraido
          })),
          informes_recientes: informesRecientes.map(informe => ({
            id: informe.id,
            resumen_corto: informe.resumen.substring(0, 80) + '...',
            fecha: informe.fecha_generacion,
            cv_archivo: informe.cv.archivo
          })),
          entrevistas_recientes: entrevistasRecientes,
          ultimo_resultado: ultimaEntrevista
        }
      });

    } catch (error) {
      logger.error("Error obteniendo dashboard", error, {
        user_id: req.user?.id
      });
      res.status(500).json({ error: error.message });
    }
  }

  // 📈 Estadísticas detalladas del alumno
  static async obtenerEstadisticasDetalladas(req, res) {
    try {
      const alumnoId = req.user.id;

      // Evolución de entrevistas (últimos 6 meses)
      const fechaInicio = new Date();
      fechaInicio.setMonth(fechaInicio.getMonth() - 6);

      const entrevistasEvolucion = await Entrevista.findAll({
        where: { 
          alumnoId,
          fecha: { [require('sequelize').Op.gte]: fechaInicio },
          promedio_puntuacion: { [require('sequelize').Op.not]: null }
        },
        order: [['fecha', 'ASC']],
        attributes: ['fecha', 'promedio_puntuacion', 'resultado_final']
      });

      // Distribución de resultados
      const distribucionResultados = await Entrevista.findAll({
        where: { 
          alumnoId,
          resultado_final: { [require('sequelize').Op.not]: null }
        },
        attributes: [
          'resultado_final',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'cantidad']
        ],
        group: ['resultado_final']
      });

      // Promedio general de puntuaciones
      const promedioGeneral = await Entrevista.findOne({
        where: { 
          alumnoId,
          promedio_puntuacion: { [require('sequelize').Op.not]: null }
        },
        attributes: [
          [require('sequelize').fn('AVG', require('sequelize').col('promedio_puntuacion')), 'promedio']
        ]
      });

      // CVs por mes (últimos 12 meses)
      const fechaInicioCV = new Date();
      fechaInicioCV.setMonth(fechaInicioCV.getMonth() - 12);

      const cvsPorMes = await CV.findAll({
        where: { 
          alumnoId,
          fecha_creacion: { [require('sequelize').Op.gte]: fechaInicioCV }
        },
        attributes: [
          [require('sequelize').fn('DATE_TRUNC', 'month', require('sequelize').col('fecha_creacion')), 'mes'],
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'cantidad']
        ],
        group: [require('sequelize').fn('DATE_TRUNC', 'month', require('sequelize').col('fecha_creacion'))],
        order: [[require('sequelize').fn('DATE_TRUNC', 'month', require('sequelize').col('fecha_creacion')), 'ASC']]
      });

      res.json({
        estadisticas_detalladas: {
          evolucion_entrevistas: entrevistasEvolucion,
          distribucion_resultados: distribucionResultados,
          promedio_general: promedioGeneral ? parseFloat(promedioGeneral.getDataValue('promedio')).toFixed(2) : null,
          cvs_por_mes: cvsPorMes,
          periodo_analizado: {
            entrevistas: fechaInicio.toISOString(),
            cvs: fechaInicioCV.toISOString()
          }
        }
      });

    } catch (error) {
      logger.error("Error obteniendo estadísticas detalladas", error, {
        user_id: req.user?.id
      });
      res.status(500).json({ error: error.message });
    }
  }

  // 🎯 Recomendaciones personalizadas
  static async obtenerRecomendaciones(req, res) {
    try {
      const alumnoId = req.user.id;
      const recomendaciones = [];

      // Verificar si tiene CVs sin procesar
      const cvsSinProcesar = await CV.count({
        where: { 
          alumnoId,
          contenido_extraido: null
        }
      });

      if (cvsSinProcesar > 0) {
        recomendaciones.push({
          tipo: "accion_urgente",
          prioridad: "alta",
          titulo: "Procesar CVs pendientes",
          descripcion: `Tienes ${cvsSinProcesar} CV(s) sin procesar. Procésalos para obtener análisis detallados con IA.`,
          enlace: "/api/cv",
          icono: "📄",
          accion: "Procesar ahora",
          beneficio: "Obtener análisis profesional y detectar fortalezas"
        });
      }

      // Análisis de rendimiento en entrevistas
      const entrevistas = await Entrevista.findAll({
        where: { 
          alumnoId,
          promedio_puntuacion: { [require('sequelize').Op.not]: null }
        },
        order: [['fecha', 'DESC']],
        limit: 5
      });

      if (entrevistas.length === 0) {
        recomendaciones.push({
          tipo: "primer_paso",
          prioridad: "alta",
          titulo: "Comienza tu primera entrevista",
          descripcion: "Practica tus habilidades de entrevista con nuestro simulador inteligente powered by IA.",
          enlace: "/api/entrevistas/iniciar",
          icono: "🎯",
          accion: "Iniciar entrevista",
          beneficio: "Mejorar técnicas de comunicación y confianza"
        });
      } else {
        const puntuaciones = entrevistas.map(e => e.promedio_puntuacion);
        const stats = utilsService.calculateStats(puntuaciones);
        const ultimaEntrevista = entrevistas[0];
        const diasDesdeUltima = Math.floor((new Date() - ultimaEntrevista.fecha) / (1000 * 60 * 60 * 24));

        // Analizar tendencia
        let tendencia = 'estable';
        if (entrevistas.length >= 3) {
          const recientes = puntuaciones.slice(0, 2);
          const anteriores = puntuaciones.slice(2, 4);
          const promedioReciente = recientes.reduce((a, b) => a + b, 0) / recientes.length;
          const promedioAnterior = anteriores.reduce((a, b) => a + b, 0) / anteriores.length;
          
          if (promedioReciente > promedioAnterior + 0.5) tendencia = 'mejorando';
          else if (promedioReciente < promedioAnterior - 0.5) tendencia = 'declinando';
        }

        // Recomendaciones basadas en rendimiento
        if (stats.average < 6) {
          recomendaciones.push({
            tipo: "mejora_critica",
            prioridad: "alta",
            titulo: "Reforzar técnicas de entrevista",
            descripcion: `Tu promedio actual es ${stats.average.toFixed(1)}/10. Es momento de intensificar la práctica.`,
            enlace: "/api/entrevistas/iniciar",
            icono: "📈",
            accion: "Practicar más",
            beneficio: "Aumentar confianza y mejorar respuestas",
            detalles: {
              promedio_actual: stats.average.toFixed(1),
              objetivo: "7.0+",
              diferencia: (7.0 - stats.average).toFixed(1)
            }
          });
        }

        if (tendencia === 'declinando') {
          recomendaciones.push({
            tipo: "alerta_tendencia",
            prioridad: "media",
            titulo: "Tendencia descendente detectada",
            descripcion: "Tus últimas entrevistas muestran una disminución. Revisa la retroalimentación recibida.",
            enlace: "/api/entrevistas/historial",
            icono: "⚠️",
            accion: "Revisar historial",
            beneficio: "Identificar áreas de mejora específicas"
          });
        }

        if (diasDesdeUltima > 7 && stats.average < 8) {
          recomendaciones.push({
            tipo: "practica_regular",
            prioridad: "media",
            titulo: "Tiempo de practicar nuevamente",
            descripcion: `Han pasado ${diasDesdeUltima} días desde tu última entrevista. La práctica constante es clave para mejorar.`,
            enlace: "/api/entrevistas/iniciar",
            icono: "🕐",
            accion: "Nueva entrevista",
            beneficio: "Mantener y mejorar habilidades adquiridas"
          });
        }

        if (stats.average >= 8.5) {
          recomendaciones.push({
            tipo: "excelencia",
            prioridad: "baja",
            titulo: "¡Excelente rendimiento!",
            descripcion: `Tu promedio de ${stats.average.toFixed(1)}/10 es excepcional. Considera desafíos más avanzados.`,
            enlace: "/api/entrevistas/iniciar",
            icono: "🌟",
            accion: "Mantener nivel",
            beneficio: "Consolidar excelencia y explorar nuevos retos"
          });
        }

        if (tendencia === 'mejorando') {
          recomendaciones.push({
            tipo: "motivacion",
            prioridad: "baja",
            titulo: "¡Progreso positivo detectado!",
            descripcion: "Has mostrado mejora constante en tus últimas entrevistas. ¡Continúa con esta tendencia!",
            enlace: "/api/dashboard/estadisticas",
            icono: "📊",
            accion: "Ver progreso",
            beneficio: "Motivación y seguimiento del crecimiento"
          });
        }
      }

      // Verificar informes sin revisar
      const informesSinRevisar = await Informe.count({
        include: [
          {
            model: CV,
            as: 'cv',
            where: { alumnoId }
          }
        ]
      });

      if (informesSinRevisar > 0) {
        recomendaciones.push({
          tipo: "recurso_disponible",
          prioridad: "media",
          titulo: "Informes listos para descarga",
          descripcion: `Tienes ${informesSinRevisar} informe(s) de análisis disponible(s). Descárgalos para revisión detallada.`,
          enlace: "/api/informes",
          icono: "📋",
          accion: "Ver informes",
          beneficio: "Acceso a análisis profesional completo"
        });
      }

      // Verificar actividad reciente
      const ultimaActividad = await Promise.all([
        CV.findOne({ where: { alumnoId }, order: [['createdAt', 'DESC']] }),
        Entrevista.findOne({ where: { alumnoId }, order: [['fecha', 'DESC']] })
      ]);

      const [ultimoCV, ultimaEntrevistaAny] = ultimaActividad;
      const ultimaActividadFecha = Math.max(
        ultimoCV ? new Date(ultimoCV.createdAt).getTime() : 0,
        ultimaEntrevistaAny ? new Date(ultimaEntrevistaAny.fecha).getTime() : 0
      );

      const diasSinActividad = Math.floor((Date.now() - ultimaActividadFecha) / (1000 * 60 * 60 * 24));

      if (diasSinActividad > 14) {
        recomendaciones.push({
          tipo: "reactivacion",
          prioridad: "media",
          titulo: "Tiempo de reactivar tu preparación",
          descripcion: `Has estado inactivo por ${diasSinActividad} días. Retoma tu preparación laboral.`,
          enlace: "/api/dashboard",
          icono: "🔄",
          accion: "Reactivar",
          beneficio: "Mantener momentum en tu búsqueda laboral"
        });
      }

      // Recomendaciones específicas basadas en datos
      const recomendacionesPersonalizadas = utilsService.generateRecommendations(
        entrevistas.length > 0 ? utilsService.calculateStats(puntuaciones).average : 0,
        entrevistas.length > 0 ? entrevistas[0].promedio_puntuacion : 0,
        tendencia
      );

      // Convertir recomendaciones de utils a formato completo
      recomendacionesPersonalizadas.forEach(rec => {
        recomendaciones.push({
          tipo: rec.type,
          prioridad: rec.priority,
          titulo: rec.title,
          descripcion: rec.description,
          enlace: "/api/entrevistas/iniciar",
          icono: rec.type === 'improvement' ? "⚡" : rec.type === 'success' ? "🎉" : "💡",
          accion: "Actuar",
          beneficio: "Mejora continua"
        });
      });

      // Ordenar por prioridad
      const prioridadOrden = { 'alta': 1, 'media': 2, 'baja': 3 };
      recomendaciones.sort((a, b) => prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad]);

      // Limitar a máximo 6 recomendaciones
      const recomendacionesFinales = recomendaciones.slice(0, 6);

      res.json({
        recomendaciones: recomendacionesFinales,
        resumen: {
          total: recomendacionesFinales.length,
          por_prioridad: {
            alta: recomendacionesFinales.filter(r => r.prioridad === 'alta').length,
            media: recomendacionesFinales.filter(r => r.prioridad === 'media').length,
            baja: recomendacionesFinales.filter(r => r.prioridad === 'baja').length
          }
        },
        estado_general: {
          cvs_procesados: await CV.count({ where: { alumnoId, contenido_extraido: { [require('sequelize').Op.not]: null } } }),
          entrevistas_completadas: entrevistas.length,
          promedio_entrevistas: entrevistas.length > 0 ? utilsService.calculateStats(puntuaciones).average.toFixed(1) : 'N/A',
          tendencia: tendencia,
          dias_sin_actividad: diasSinActividad
        }
      });

    } catch (error) {
      logger.error("Error obteniendo recomendaciones", error, {
        user_id: req.user?.id
      });
      res.status(500).json({ error: error.message });
    }
  }

  // 🧠 Analytics avanzado del alumno (nuevo endpoint)
  static async obtenerAnalyticsAvanzado(req, res) {
    try {
      const alumnoId = req.user.id;
      
      logger.info("Generando analytics avanzado", {
        user_id: alumnoId
      });

      const analytics = await analyticsService.getStudentAnalytics(alumnoId);
      
      if (!analytics.success) {
        return res.status(500).json({
          error: "Error generando analytics",
          details: analytics.error
        });
      }

      logger.success("Analytics generado correctamente", {
        user_id: alumnoId,
        data_points: Object.keys(analytics.data).length
      });

      res.json({
        message: "Analytics generado correctamente",
        ...analytics
      });

    } catch (error) {
      logger.error("Error obteniendo analytics avanzado", error, {
        user_id: req.user?.id
      });
      res.status(500).json({ error: error.message });
    }
  }

}

module.exports = DashboardController;