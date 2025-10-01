const { 
  Entrevista, 
  Alumno, 
  Carrera,
  HistorialEntrevista 
} = require("../models");
const interviewAIService = require("../services/InterviewAIService");
const logger = require("../services/LoggerService");

class EntrevistaController {

  // 🎯 Iniciar nueva entrevista con IA (ÚNICO POR ALUMNO)
  static async iniciarEntrevista(req, res) {
    try {
      const alumnoId = req.user.id;
      const { carreraId, dificultad = 'intermedia' } = req.body;

      // Validaciones
      if (!carreraId) {
        return res.status(400).json({ 
          error: "ID de carrera requerido" 
        });
      }

      if (!['basica', 'intermedia', 'avanzada'].includes(dificultad)) {
        return res.status(400).json({ 
          error: "Dificultad debe ser: basica, intermedia o avanzada" 
        });
      }

      // Obtener datos del alumno y carrera
      const [alumno, carrera] = await Promise.all([
        Alumno.findByPk(alumnoId),
        Carrera.findByPk(carreraId)
      ]);

      if (!carrera) {
        return res.status(404).json({ 
          error: "Carrera no encontrada" 
        });
      }

      // 🆕 BUSCAR SI YA EXISTE UNA ENTREVISTA ACTIVA
      let entrevista = await Entrevista.findOne({
        where: { 
          alumnoId,
          estado: { [require('sequelize').Op.in]: ['iniciada', 'en_progreso'] }
        }
      });

      // Iniciar conversación con IA
      const inicioIA = await interviewAIService.iniciarEntrevista(
        carrera,
        dificultad,
        alumno.nombre
      );

      if (!inicioIA.success) {
        logger.warn('IA no disponible, usando modo fallback');
      }

      // 🆕 SI YA EXISTE, ACTUALIZARLA (SOBRESCRIBIR)
      if (entrevista) {
        logger.info('Sobrescribiendo entrevista activa existente', {
          user_id: alumnoId,
          entrevista_id: entrevista.id
        });

        await entrevista.update({
          carreraId,
          dificultad,
          estado: 'en_progreso',
          fecha: new Date(), // Nueva fecha de inicio
          historial_conversacion: inicioIA.historial || [],
          promedio_puntuacion: null,
          resultado_final: null,
          evaluacion_final_ia: null,
          fortalezas_detectadas: null,
          areas_mejora_detectadas: null,
          duracion_minutos: null
        });

        logger.info('Entrevista reiniciada', {
          user_id: alumnoId,
          entrevista_id: entrevista.id
        });

      } else {
        // 🆕 SI NO EXISTE, CREAR NUEVA
        entrevista = await Entrevista.create({
          alumnoId,
          carreraId,
          dificultad,
          estado: 'en_progreso',
          historial_conversacion: inicioIA.historial || [],
          promedio_puntuacion: null,
          resultado_final: null
        });

        logger.interviewStarted(alumnoId, entrevista.id);
      }

      res.status(201).json({
        message: "Entrevista iniciada correctamente",
        entrevista: {
          id: entrevista.id,
          carrera: carrera.nombre,
          dificultad: entrevista.dificultad,
          estado: entrevista.estado,
          fecha: entrevista.fecha
        },
        mensaje_ia: inicioIA.mensaje,
        ai_disponible: inicioIA.success,
        es_nueva: !entrevista.updatedAt || entrevista.createdAt === entrevista.updatedAt
      });

    } catch (error) {
      logger.error("Error iniciando entrevista", error, {
        user_id: req.user?.id
      });
      res.status(500).json({ error: error.message });
    }
  }

  // 💬 Enviar mensaje en la entrevista (chat)
  static async enviarMensaje(req, res) {
    try {
      const { entrevistaId } = req.params;
      const { mensaje } = req.body;
      const alumnoId = req.user.id;

      // Validaciones
      if (!mensaje || mensaje.trim().length === 0) {
        return res.status(400).json({ 
          error: "Mensaje requerido" 
        });
      }

      // Verificar que la entrevista pertenece al alumno
      const entrevista = await Entrevista.findOne({
        where: { id: entrevistaId, alumnoId },
        include: [
          { model: Carrera, as: 'carrera' }
        ]
      });

      if (!entrevista) {
        return res.status(404).json({ error: "Entrevista no encontrada" });
      }

      if (entrevista.estado === 'completada') {
        return res.status(400).json({ 
          error: "Esta entrevista ya fue completada" 
        });
      }

      // Agregar mensaje del usuario al historial
      const historialActual = entrevista.historial_conversacion || [];
      historialActual.push({
        role: 'user',
        content: mensaje,
        timestamp: new Date().toISOString()
      });

      // Obtener respuesta de la IA
      const respuestaIA = await interviewAIService.continuarEntrevista(
        historialActual,
        mensaje,
        entrevista.carrera,
        entrevista.dificultad
      );

      if (!respuestaIA.success) {
        logger.warn('IA no disponible para respuesta', {
          entrevista_id: entrevistaId
        });
      }

      // Agregar respuesta de la IA al historial
      historialActual.push({
        role: 'assistant',
        content: respuestaIA.mensaje,
        timestamp: new Date().toISOString()
      });

      // Actualizar entrevista
      await entrevista.update({
        historial_conversacion: historialActual,
        estado: 'en_progreso'
      });

      res.json({
        message: "Mensaje enviado correctamente",
        respuesta_ia: respuestaIA.mensaje,
        total_mensajes: historialActual.length,
        ai_disponible: respuestaIA.success
      });

    } catch (error) {
      logger.error("Error procesando mensaje", error, {
        user_id: req.user?.id,
        entrevista_id: req.params.entrevistaId
      });
      res.status(500).json({ error: error.message });
    }
  }

  // 📊 Finalizar entrevista y generar evaluación
  static async finalizarEntrevista(req, res) {
    const startTime = Date.now();
    
    try {
      const { entrevistaId } = req.params;
      const alumnoId = req.user.id;

      const entrevista = await Entrevista.findOne({
        where: { id: entrevistaId, alumnoId },
        include: [
          { model: Carrera, as: 'carrera' }
        ]
      });

      if (!entrevista) {
        return res.status(404).json({ error: "Entrevista no encontrada" });
      }

      if (entrevista.estado === 'completada') {
        return res.status(400).json({ 
          error: "Esta entrevista ya fue completada anteriormente" 
        });
      }

      const historial = entrevista.historial_conversacion || [];

      if (historial.length < 4) {
        return res.status(400).json({ 
          error: "La entrevista es muy corta. Debe tener al menos 2 intercambios de mensajes." 
        });
      }

      logger.info('Generando evaluación final con IA', {
        entrevista_id: entrevistaId,
        total_mensajes: historial.length
      });

      // Generar evaluación con IA
      const evaluacionIA = await interviewAIService.generarEvaluacionFinal(
        historial,
        entrevista.carrera,
        entrevista.dificultad
      );

      const evaluacion = evaluacionIA.evaluacion;

      // Calcular duración
      const fechaInicio = new Date(entrevista.fecha);
      const duracionMinutos = Math.round((Date.now() - fechaInicio.getTime()) / 1000 / 60);

      // Actualizar entrevista con evaluación
      await entrevista.update({
        estado: 'completada',
        promedio_puntuacion: evaluacion.puntuacion_global,
        resultado_final: evaluacion.nivel_desempenio,
        evaluacion_final_ia: evaluacion.comentario_final,
        fortalezas_detectadas: evaluacion.fortalezas,
        areas_mejora_detectadas: evaluacion.areas_mejora,
        duracion_minutos: duracionMinutos
      });

      // Crear registro en historial
      await HistorialEntrevista.create({
        entrevistaId: entrevista.id,
        resultado: evaluacion.nivel_desempenio
      });

      const processingTime = Date.now() - startTime;
      
      logger.interviewCompleted(
        alumnoId,
        entrevistaId,
        evaluacion.puntuacion_global,
        duracionMinutos
      );

      res.json({
        message: "Entrevista finalizada correctamente",
        evaluacion: {
          puntuacion_global: evaluacion.puntuacion_global,
          nivel_desempenio: evaluacion.nivel_desempenio,
          fortalezas: evaluacion.fortalezas,
          areas_mejora: evaluacion.areas_mejora,
          evaluacion_detallada: evaluacion.evaluacion_detallada,
          recomendacion: evaluacion.recomendacion_contratacion,
          comentario_final: evaluacion.comentario_final,
          proximos_pasos: evaluacion.proximos_pasos_sugeridos
        },
        estadisticas: {
          duracion_minutos: duracionMinutos,
          total_intercambios: Math.floor(historial.length / 2),
          total_mensajes: historial.length
        },
        processing_time: processingTime + 'ms',
        ai_disponible: evaluacionIA.success
      });

    } catch (error) {
      logger.error("Error finalizando entrevista", error, {
        user_id: req.user?.id,
        entrevista_id: req.params.entrevistaId
      });
      res.status(500).json({ error: error.message });
    }
  }

  // 📋 Obtener historial completo de la entrevista
  static async obtenerHistorial(req, res) {
    try {
      const { entrevistaId } = req.params;
      const alumnoId = req.user.id;

      const entrevista = await Entrevista.findOne({
        where: { id: entrevistaId, alumnoId },
        include: [
          { model: Carrera, as: 'carrera' },
          { model: Alumno, as: 'alumno', attributes: ['nombre', 'correo'] }
        ]
      });

      if (!entrevista) {
        return res.status(404).json({ error: "Entrevista no encontrada" });
      }

      res.json({
        entrevista: {
          id: entrevista.id,
          carrera: entrevista.carrera.nombre,
          dificultad: entrevista.dificultad,
          estado: entrevista.estado,
          fecha_inicio: entrevista.fecha,
          duracion_minutos: entrevista.duracion_minutos,
          puntuacion: entrevista.promedio_puntuacion,
          resultado: entrevista.resultado_final,
          historial: entrevista.historial_conversacion || [],
          evaluacion_final: entrevista.evaluacion_final_ia,
          fortalezas: entrevista.fortalezas_detectadas,
          areas_mejora: entrevista.areas_mejora_detectadas
        }
      });

    } catch (error) {
      logger.error("Error obteniendo historial", error);
      res.status(500).json({ error: error.message });
    }
  }

  // 📋 Obtener todas las entrevistas del alumno
  static async obtenerTodasEntrevistas(req, res) {
    try {
      const alumnoId = req.user.id;
      const { estado, carreraId, dificultad } = req.query;

      const where = { alumnoId };
      
      if (estado) where.estado = estado;
      if (carreraId) where.carreraId = parseInt(carreraId);
      if (dificultad) where.dificultad = dificultad;

      const entrevistas = await Entrevista.findAll({
        where,
        include: [
          { 
            model: Carrera, 
            as: 'carrera',
            attributes: ['id', 'nombre', 'area']
          }
        ],
        order: [['fecha', 'DESC']],
        attributes: {
          exclude: ['historial_conversacion', 'evaluacion_final_ia']
        }
      });

      // Estadísticas generales
      const estadisticas = {
        total: entrevistas.length,
        completadas: entrevistas.filter(e => e.estado === 'completada').length,
        en_progreso: entrevistas.filter(e => e.estado === 'en_progreso').length,
        promedio_puntuacion: null
      };

      const completadas = entrevistas.filter(e => e.promedio_puntuacion !== null);
      if (completadas.length > 0) {
        const suma = completadas.reduce((acc, e) => acc + e.promedio_puntuacion, 0);
        estadisticas.promedio_puntuacion = (suma / completadas.length).toFixed(2);
      }

      res.json({
        entrevistas: entrevistas.map(e => ({
          id: e.id,
          carrera: e.carrera.nombre,
          area: e.carrera.area,
          dificultad: e.dificultad,
          estado: e.estado,
          fecha: e.fecha,
          duracion_minutos: e.duracion_minutos,
          puntuacion: e.promedio_puntuacion,
          resultado: e.resultado_final,
          fortalezas_count: e.fortalezas_detectadas?.length || 0,
          areas_mejora_count: e.areas_mejora_detectadas?.length || 0
        })),
        estadisticas
      });

    } catch (error) {
      logger.error("Error obteniendo entrevistas", error);
      res.status(500).json({ error: error.message });
    }
  }

  // 🆕 Obtener la entrevista activa actual (la que está en progreso)
  static async obtenerEntrevistaActiva(req, res) {
    try {
      const alumnoId = req.user.id;

      const entrevista = await Entrevista.findOne({
        where: { 
          alumnoId,
          estado: { [require('sequelize').Op.in]: ['iniciada', 'en_progreso'] }
        },
        include: [
          { model: Carrera, as: 'carrera' },
          { model: Alumno, as: 'alumno', attributes: ['nombre', 'correo'] }
        ]
      });

      if (!entrevista) {
        return res.status(404).json({ 
          error: "No hay entrevista activa",
          message: "Inicia una nueva entrevista para comenzar"
        });
      }

      res.json({
        entrevista: {
          id: entrevista.id,
          carrera: entrevista.carrera.nombre,
          dificultad: entrevista.dificultad,
          estado: entrevista.estado,
          fecha_inicio: entrevista.fecha,
          historial: entrevista.historial_conversacion || [],
          total_mensajes: (entrevista.historial_conversacion || []).length
        }
      });

    } catch (error) {
      logger.error("Error obteniendo entrevista activa", error);
      res.status(500).json({ error: error.message });
    }
  }

  // 🗑️ Abandonar/Cancelar entrevista
  static async abandonarEntrevista(req, res) {
    try {
      const { entrevistaId } = req.params;
      const alumnoId = req.user.id;

      const entrevista = await Entrevista.findOne({
        where: { id: entrevistaId, alumnoId }
      });

      if (!entrevista) {
        return res.status(404).json({ error: "Entrevista no encontrada" });
      }

      if (entrevista.estado === 'completada') {
        return res.status(400).json({ 
          error: "No se puede abandonar una entrevista completada" 
        });
      }

      await entrevista.update({
        estado: 'abandonada'
      });

      logger.info('Entrevista abandonada', {
        user_id: alumnoId,
        entrevista_id: entrevistaId
      });

      res.json({
        message: "Entrevista abandonada correctamente"
      });

    } catch (error) {
      logger.error("Error abandonando entrevista", error);
      res.status(500).json({ error: error.message });
    }
  }

  // 📊 Obtener estadísticas de entrevistas del alumno
  static async obtenerEstadisticas(req, res) {
    try {
      const alumnoId = req.user.id;

      const entrevistas = await Entrevista.findAll({
        where: { alumnoId },
        include: [{ model: Carrera, as: 'carrera' }]
      });

      if (entrevistas.length === 0) {
        return res.json({
          message: "No hay entrevistas registradas",
          estadisticas: null
        });
      }

      const completadas = entrevistas.filter(e => e.estado === 'completada');
      const puntuaciones = completadas
        .filter(e => e.promedio_puntuacion !== null)
        .map(e => e.promedio_puntuacion);

      // Distribución por dificultad
      const porDificultad = {
        basica: entrevistas.filter(e => e.dificultad === 'basica').length,
        intermedia: entrevistas.filter(e => e.dificultad === 'intermedia').length,
        avanzada: entrevistas.filter(e => e.dificultad === 'avanzada').length
      };

      // Distribución por carrera
      const porCarrera = {};
      entrevistas.forEach(e => {
        const carrera = e.carrera.nombre;
        porCarrera[carrera] = (porCarrera[carrera] || 0) + 1;
      });

      // Top fortalezas detectadas
      const fortalezasMap = {};
      completadas.forEach(e => {
        if (e.fortalezas_detectadas) {
          e.fortalezas_detectadas.forEach(f => {
            fortalezasMap[f] = (fortalezasMap[f] || 0) + 1;
          });
        }
      });

      const topFortalezas = Object.entries(fortalezasMap)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([fortaleza, frecuencia]) => ({ fortaleza, frecuencia }));

      // Evolución de puntuaciones
      const evolucion = completadas
        .filter(e => e.promedio_puntuacion !== null)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
        .map(e => ({
          fecha: e.fecha,
          puntuacion: e.promedio_puntuacion,
          dificultad: e.dificultad
        }));

      res.json({
        estadisticas: {
          resumen: {
            total_entrevistas: entrevistas.length,
            completadas: completadas.length,
            en_progreso: entrevistas.filter(e => e.estado === 'en_progreso').length,
            abandonadas: entrevistas.filter(e => e.estado === 'abandonada').length
          },
          puntuaciones: {
            promedio: puntuaciones.length > 0 
              ? (puntuaciones.reduce((a, b) => a + b, 0) / puntuaciones.length).toFixed(2)
              : null,
            mejor: puntuaciones.length > 0 ? Math.max(...puntuaciones) : null,
            peor: puntuaciones.length > 0 ? Math.min(...puntuaciones) : null
          },
          distribucion: {
            por_dificultad: porDificultad,
            por_carrera: porCarrera
          },
          top_fortalezas: topFortalezas,
          evolucion_temporal: evolucion
        }
      });

    } catch (error) {
      logger.error("Error obteniendo estadísticas", error);
      res.status(500).json({ error: error.message });
    }
  }

}

module.exports = EntrevistaController;