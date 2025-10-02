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

      // 🔧 IMPORTANTE: Solo crear/resetear si NO hay entrevista activa
      // Si hay una entrevista activa, NO la reiniciamos - continuamos con ella
      if (!entrevista) {
        // Crear nueva entrevista
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
        
        return res.status(201).json({
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
          es_nueva: true
        });
      }

      // Si ya existe una entrevista activa, retornar error
      return res.status(400).json({
        error: "Ya tienes una entrevista en progreso",
        entrevista_activa: {
          id: entrevista.id,
          carrera_id: entrevista.carreraId,
          dificultad: entrevista.dificultad,
          fecha_inicio: entrevista.fecha,
          mensajes_actuales: (entrevista.historial_conversacion || []).length
        },
        sugerencia: "Finaliza o abandona la entrevista actual antes de iniciar una nueva",
        acciones: [
          {
            accion: "Continuar entrevista actual",
            endpoint: `POST /api/entrevistas/${entrevista.id}/mensaje`
          },
          {
            accion: "Finalizar entrevista actual",
            endpoint: `POST /api/entrevistas/${entrevista.id}/finalizar`
          },
          {
            accion: "Abandonar entrevista actual",
            endpoint: `POST /api/entrevistas/${entrevista.id}/abandonar`
          }
        ]
      });

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

  // 💬 Enviar mensaje en la entrevista (chat) - CON DEBUG MEJORADO
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

      // 🔍 DEBUG: Historial ANTES de procesar
      const historialAntes = entrevista.historial_conversacion || [];
      logger.info('📥 Mensaje recibido - Estado ANTES', {
        entrevista_id: entrevistaId,
        historial_length_antes: historialAntes.length,
        mensajes_usuario_antes: historialAntes.filter(m => m.role === 'user').length,
        mensajes_asistente_antes: historialAntes.filter(m => m.role === 'assistant').length
      });

      // Obtener historial actual (copia del array)
      const historialActual = [...historialAntes];
      
      // Agregar mensaje del usuario al historial
      const mensajeUsuario = {
        role: 'user',
        content: mensaje,
        timestamp: new Date().toISOString()
      };
      historialActual.push(mensajeUsuario);

      logger.info('➕ Mensaje del usuario agregado', {
        historial_length_despues: historialActual.length,
        mensaje_content_length: mensaje.length
      });

      // Obtener respuesta de la IA (pasando todo el historial)
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
      const mensajeAsistente = {
        role: 'assistant',
        content: respuestaIA.mensaje,
        timestamp: new Date().toISOString()
      };
      historialActual.push(mensajeAsistente);

      logger.info('➕ Respuesta de IA agregada', {
        historial_length_final: historialActual.length,
        respuesta_content_length: respuestaIA.mensaje.length
      });

      // 🔍 DEBUG: Verificar que el historial creció
      if (historialActual.length <= historialAntes.length) {
        logger.error('⚠️ PROBLEMA: El historial NO creció correctamente', {
          antes: historialAntes.length,
          despues: historialActual.length
        });
      }

      // Guardar en base de datos
      await entrevista.update({
        historial_conversacion: historialActual,
        estado: 'en_progreso'
      });

      // 🔍 DEBUG: Verificar que se guardó correctamente en BD
      const entrevistaVerificacion = await Entrevista.findByPk(entrevistaId);
      const historialEnBD = entrevistaVerificacion.historial_conversacion || [];
      
      logger.info('💾 Guardado en BD - Verificación', {
        historial_length_guardado: historialEnBD.length,
        coincide_con_local: historialEnBD.length === historialActual.length
      });

      if (historialEnBD.length !== historialActual.length) {
        logger.error('⚠️ PROBLEMA: El historial en BD no coincide con el local', {
          local: historialActual.length,
          bd: historialEnBD.length
        });
      }

      // Contar correctamente excluyendo mensajes del sistema
      const historialSinSistema = historialActual.filter(m => m.role !== 'system');
      const mensajesUsuario = historialSinSistema.filter(m => m.role === 'user');
      const mensajesAsistente = historialSinSistema.filter(m => m.role === 'assistant');

      logger.success('✅ Mensaje procesado correctamente', {
        entrevista_id: entrevistaId,
        total_mensajes_guardados: historialActual.length,
        mensajes_usuario: mensajesUsuario.length,
        mensajes_asistente: mensajesAsistente.length,
        incremento: historialActual.length - historialAntes.length
      });

      res.json({
        message: "Mensaje enviado correctamente",
        respuesta_ia: respuestaIA.mensaje,
        total_mensajes: historialActual.length,
        mensajes_usuario: mensajesUsuario.length,
        mensajes_asistente: mensajesAsistente.length,
        puede_finalizar: mensajesUsuario.length >= 1,
        ai_disponible: respuestaIA.success
      });

    } catch (error) {
      logger.error("Error procesando mensaje", error, {
        user_id: req.user?.id,
        entrevista_id: req.params.entrevistaId,
        stack: error.stack
      });
      res.status(500).json({ error: error.message });
    }
  }

  // 📊 Finalizar entrevista y generar evaluación (VERSIÓN CORREGIDA)
  static async finalizarEntrevista(req, res) {
    const startTime = Date.now();
    
    try {
      const { entrevistaId } = req.params;
      const alumnoId = req.user.id;

      // Buscar entrevista
      const entrevista = await Entrevista.findOne({
        where: { id: entrevistaId, alumnoId },
        include: [
          { model: Carrera, as: 'carrera' }
        ]
      });

      if (!entrevista) {
        return res.status(404).json({ 
          error: "Entrevista no encontrada",
          code: "ENTREVISTA_NOT_FOUND"
        });
      }

      // Verificar si ya está completada
      if (entrevista.estado === 'completada') {
        return res.status(400).json({ 
          error: "Esta entrevista ya fue completada anteriormente",
          fecha_completada: entrevista.updatedAt,
          evaluacion_existente: {
            puntuacion: entrevista.promedio_puntuacion,
            resultado: entrevista.resultado_final
          }
        });
      }

      // Obtener historial y filtrar solo mensajes de usuario/asistente (no system)
      const historialCompleto = entrevista.historial_conversacion || [];
      const historial = historialCompleto.filter(m => m.role !== 'system');
      
      // Contar mensajes del usuario específicamente
      const mensajesUsuario = historial.filter(m => m.role === 'user');
      const mensajesAsistente = historial.filter(m => m.role === 'assistant');

      // VALIDACIÓN: El usuario debe haber enviado al menos 1 mensaje
      if (mensajesUsuario.length === 0) {
        return res.status(400).json({ 
          error: "Debes responder al menos una pregunta antes de finalizar la entrevista.",
          mensajes_usuario_actuales: mensajesUsuario.length,
          mensajes_asistente: mensajesAsistente.length,
          total_mensajes: historial.length,
          sugerencia: "Usa POST /api/entrevistas/:id/mensaje para enviar tu respuesta."
        });
      }

      // Validación adicional: debe haber al menos un intercambio completo
      if (historial.length < 2) {
        return res.status(400).json({ 
          error: "La entrevista necesita al menos un intercambio completo (pregunta + respuesta).",
          mensajes_usuario: mensajesUsuario.length,
          mensajes_asistente: mensajesAsistente.length,
          sugerencia: "Asegúrate de haber respondido a la pregunta del entrevistador."
        });
      }

      logger.info('Generando evaluación final con IA', {
        entrevista_id: entrevistaId,
        total_mensajes: historial.length,
        mensajes_usuario: mensajesUsuario.length,
        dificultad: entrevista.dificultad
      });

      // Generar evaluación con IA
      const evaluacionIA = await interviewAIService.generarEvaluacionFinal(
        historial,
        entrevista.carrera,
        entrevista.dificultad
      );

      let evaluacion;

      // Si la IA no está disponible o falló, usar evaluación básica
      if (!evaluacionIA.success) {
        logger.warn('IA no disponible, usando evaluación básica', {
          entrevista_id: entrevistaId,
          error: evaluacionIA.error
        });

        // Evaluación básica basada en cantidad de mensajes del usuario
        let puntuacionBase = 5.0;

        // Ajustar puntuación según participación
        if (mensajesUsuario.length >= 5) puntuacionBase = 7.5;
        else if (mensajesUsuario.length >= 3) puntuacionBase = 6.5;
        else if (mensajesUsuario.length >= 2) puntuacionBase = 6.0;
        else if (mensajesUsuario.length >= 1) puntuacionBase = 5.5;

        evaluacion = {
          puntuacion_global: puntuacionBase,
          nivel_desempenio: puntuacionBase >= 7 ? "Bueno" : "Regular",
          fortalezas: [
            "Completó la entrevista",
            `Participó con ${mensajesUsuario.length} respuesta${mensajesUsuario.length !== 1 ? 's' : ''}`
          ],
          areas_mejora: [
            "Extender la duración de las respuestas",
            "Proporcionar ejemplos más específicos"
          ],
          evaluacion_detallada: {
            comunicacion: puntuacionBase,
            conocimiento_tecnico: puntuacionBase,
            experiencia_relevante: puntuacionBase,
            actitud_profesional: puntuacionBase,
            adaptabilidad: puntuacionBase
          },
          recomendacion_contratacion: "Requiere evaluación adicional",
          comentario_final: `El candidato completó la entrevista con ${mensajesUsuario.length} respuesta${mensajesUsuario.length !== 1 ? 's' : ''}. Se recomienda una entrevista más extensa para una evaluación completa.`,
          proximos_pasos_sugeridos: [
            "Practicar respuestas más detalladas",
            "Realizar entrevista más extensa",
            "Preparar ejemplos concretos de experiencia"
          ]
        };
      } else {
        evaluacion = evaluacionIA.evaluacion;
      }

      // Calcular duración
      const fechaInicio = new Date(entrevista.fecha);
      const duracionMinutos = Math.max(1, Math.round((Date.now() - fechaInicio.getTime()) / 1000 / 60));

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

      // Calcular estadísticas de la entrevista (usando historial filtrado)
      const promedioLongitudRespuestas = mensajesUsuario.length > 0
        ? Math.round(mensajesUsuario.reduce((sum, m) => sum + m.content.length, 0) / mensajesUsuario.length)
        : 0;

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
          total_intercambios: mensajesUsuario.length,
          total_mensajes: historial.length,
          mensajes_usuario: mensajesUsuario.length,
          mensajes_asistente: mensajesAsistente.length,
          preguntas_respondidas: mensajesUsuario.length,
          promedio_longitud_respuestas: promedioLongitudRespuestas,
          carrera: entrevista.carrera.nombre,
          dificultad: entrevista.dificultad
        },
        processing_time: processingTime + 'ms',
        ai_disponible: evaluacionIA.success,
        fecha_completada: new Date().toISOString()
      });

    } catch (error) {
      logger.error("Error finalizando entrevista", error, {
        user_id: req.user?.id,
        entrevista_id: req.params.entrevistaId
      });
      res.status(500).json({ 
        error: error.message,
        code: "INTERNAL_ERROR",
        sugerencia: "Por favor, intenta nuevamente. Si el problema persiste, contacta soporte."
      });
    }
  }

  // 🔍 Diagnosticar estado de entrevista (útil para debug)
  static async diagnosticarEntrevista(req, res) {
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
        return res.status(404).json({ 
          error: "Entrevista no encontrada",
          entrevista_id: entrevistaId,
          user_id: alumnoId
        });
      }

      const historialCompleto = entrevista.historial_conversacion || [];
      const historial = historialCompleto.filter(m => m.role !== 'system'); // Filtrar mensajes del sistema
      const mensajesUsuario = historial.filter(m => m.role === 'user');
      const mensajesAsistente = historial.filter(m => m.role === 'assistant');

      // Análisis de posibilidad de finalización
      const puedeFinalizar = mensajesUsuario.length >= 1 && entrevista.estado !== 'completada';
      const razonesNoFinalizacion = [];

      if (mensajesUsuario.length === 0) {
        razonesNoFinalizacion.push(`No has enviado ningún mensaje. Debes responder al menos una pregunta.`);
      }

      if (entrevista.estado === 'completada') {
        razonesNoFinalizacion.push('La entrevista ya está completada.');
      }

      // Diagnóstico completo
      const diagnostico = {
        info_basica: {
          id: entrevista.id,
          alumno: entrevista.alumno.nombre,
          carrera: entrevista.carrera.nombre,
          dificultad: entrevista.dificultad,
          estado: entrevista.estado,
          fecha_inicio: entrevista.fecha,
          duracion_actual_minutos: Math.round((Date.now() - new Date(entrevista.fecha).getTime()) / 1000 / 60)
        },
        historial_conversacion: {
          total_mensajes_completo: historialCompleto.length,
          total_mensajes_filtrado: historial.length,
          mensajes_usuario: mensajesUsuario.length,
          mensajes_asistente: mensajesAsistente.length,
          mensajes_sistema: historialCompleto.length - historial.length,
          promedio_longitud_respuestas_usuario: mensajesUsuario.length > 0 
            ? Math.round(mensajesUsuario.reduce((sum, m) => sum + m.content.length, 0) / mensajesUsuario.length)
            : 0,
          ultimo_mensaje: historial.length > 0 
            ? {
                role: historial[historial.length - 1].role,
                timestamp: historial[historial.length - 1].timestamp,
                longitud: historial[historial.length - 1].content.length
              }
            : null
        },
        estado_finalizacion: {
          puede_finalizar: puedeFinalizar,
          cumple_minimo_mensajes: mensajesUsuario.length >= 1,
          no_esta_completada: entrevista.estado !== 'completada',
          razones_no_finalizacion: razonesNoFinalizacion.length > 0 
            ? razonesNoFinalizacion 
            : ['✅ Ninguna - Puede finalizar sin problemas'],
          evaluacion_existente: entrevista.estado === 'completada' 
            ? {
                puntuacion: entrevista.promedio_puntuacion,
                resultado: entrevista.resultado_final,
                fecha_completada: entrevista.updatedAt
              }
            : null
        },
        recomendaciones: [],
        acciones_disponibles: []
      };

      // Generar recomendaciones
      if (mensajesUsuario.length === 0) {
        diagnostico.recomendaciones.push('⚠️ No has respondido ninguna pregunta. Envía al menos 1 mensaje antes de finalizar.');
        diagnostico.acciones_disponibles.push({
          accion: 'Enviar mensaje',
          metodo: 'POST',
          endpoint: `/api/entrevistas/${entrevistaId}/mensaje`,
          body: { mensaje: "Tu respuesta aquí..." }
        });
      } else if (mensajesUsuario.length < 3) {
        diagnostico.recomendaciones.push(`💡 Solo has respondido ${mensajesUsuario.length} pregunta(s). Se recomienda responder al menos 3 para una evaluación más completa.`);
      } else if (mensajesUsuario.length >= 5) {
        diagnostico.recomendaciones.push('✅ Excelente participación. Tienes suficiente contenido para una evaluación completa.');
      }

      if (puedeFinalizar) {
        diagnostico.recomendaciones.push('✅ Puedes finalizar la entrevista ahora.');
        diagnostico.acciones_disponibles.push({
          accion: 'Finalizar entrevista',
          metodo: 'POST',
          endpoint: `/api/entrevistas/${entrevistaId}/finalizar`
        });
      }

      if (entrevista.estado === 'en_progreso') {
        diagnostico.acciones_disponibles.push({
          accion: 'Continuar entrevista',
          metodo: 'POST',
          endpoint: `/api/entrevistas/${entrevistaId}/mensaje`,
          body: { mensaje: "Tu siguiente respuesta..." }
        });
        
        diagnostico.acciones_disponibles.push({
          accion: 'Abandonar entrevista',
          metodo: 'POST',
          endpoint: `/api/entrevistas/${entrevistaId}/abandonar`
        });
      }

      diagnostico.acciones_disponibles.push({
        accion: 'Ver historial completo',
        metodo: 'GET',
        endpoint: `/api/entrevistas/${entrevistaId}/historial`
      });

      // Calcular calidad esperada de evaluación
      let calidadEvaluacion = 'Básica';
      if (mensajesUsuario.length >= 5) calidadEvaluacion = 'Completa';
      else if (mensajesUsuario.length >= 3) calidadEvaluacion = 'Buena';
      else if (mensajesUsuario.length >= 1) calidadEvaluacion = 'Mínima';

      diagnostico.calidad_evaluacion_esperada = calidadEvaluacion;

      res.json({
        success: true,
        diagnostico,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error("Error en diagnóstico de entrevista", error, {
        user_id: req.user?.id,
        entrevista_id: req.params.entrevistaId
      });
      res.status(500).json({ 
        error: error.message 
      });
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