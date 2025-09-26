const { 
  Entrevista, 
  Alumno, 
  PreguntaEntrevista, 
  RespuestaEntrevista, 
  HistorialEntrevista 
} = require("../models");

class EntrevistaController {

  // 🎯 RF-104: Iniciar nueva entrevista
  static async iniciarEntrevista(req, res) {
    try {
      const alumnoId = req.user.id;

      // Crear nueva sesión de entrevista
      const entrevista = await Entrevista.create({
        alumnoId,
        promedio_puntuacion: null,
        resultado_final: null
      });

      // Obtener primera pregunta aleatoria
      const pregunta = await PreguntaEntrevista.findOne({
        order: [['createdAt', 'ASC']] // Por ahora tomamos la primera
      });

      if (!pregunta) {
        return res.status(404).json({ 
          error: "No hay preguntas disponibles para la entrevista" 
        });
      }

      res.status(201).json({
        message: "Entrevista iniciada correctamente",
        entrevista: {
          id: entrevista.id,
          fecha: entrevista.fecha
        },
        pregunta_actual: {
          id: pregunta.id,
          texto: pregunta.texto
        }
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 💬 RF-104: Enviar respuesta y obtener siguiente pregunta
  static async responderPregunta(req, res) {
    try {
      const { entrevistaId } = req.params;
      const { preguntaId, respuesta } = req.body;
      const alumnoId = req.user.id;

      // Verificar que la entrevista pertenece al alumno
      const entrevista = await Entrevista.findOne({
        where: { id: entrevistaId, alumnoId }
      });

      if (!entrevista) {
        return res.status(404).json({ error: "Entrevista no encontrada" });
      }

      // Verificar que la pregunta existe
      const pregunta = await PreguntaEntrevista.findByPk(preguntaId);
      if (!pregunta) {
        return res.status(404).json({ error: "Pregunta no encontrada" });
      }

      // Guardar respuesta
      const respuestaEntrevista = await RespuestaEntrevista.create({
        entrevistaId: entrevista.id,
        preguntaId,
        respuesta,
        retroalimentacion: null, // Se llenará con IA
        puntuacion: null // Se llenará con IA
      });

      // TODO: Procesar respuesta con Llama 3.1
      // Generar retroalimentación y puntuación
      
      // Obtener siguiente pregunta (simulado)
      const siguientePregunta = await PreguntaEntrevista.findOne({
        where: { id: { [require('sequelize').Op.gt]: preguntaId } }
      });

      const response = {
        message: "Respuesta registrada correctamente",
        respuesta_id: respuestaEntrevista.id,
        retroalimentacion: "Retroalimentación pendiente de procesamiento con IA"
      };

      if (siguientePregunta) {
        response.siguiente_pregunta = {
          id: siguientePregunta.id,
          texto: siguientePregunta.texto
        };
      } else {
        response.mensaje_final = "Entrevista completada. Generando evaluación final...";
      }

      res.json(response);

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 🧠 RF-105: Procesar retroalimentación con IA
  static async procesarRespuesta(req, res) {
    try {
      const { respuestaId } = req.params;
      const alumnoId = req.user.id;

      const respuestaEntrevista = await RespuestaEntrevista.findOne({
        where: { id: respuestaId },
        include: [
          {
            model: Entrevista,
            as: 'entrevista',
            where: { alumnoId }
          },
          {
            model: PreguntaEntrevista,
            as: 'pregunta'
          }
        ]
      });

      if (!respuestaEntrevista) {
        return res.status(404).json({ error: "Respuesta no encontrada" });
      }

      // TODO: Integrar con Llama 3.1 para generar retroalimentación
      const retroalimentacionSimulada = "Buena respuesta. Podrías mejorar...";
      const puntuacionSimulada = Math.floor(Math.random() * 5) + 6; // 6-10

      await respuestaEntrevista.update({
        retroalimentacion: retroalimentacionSimulada,
        puntuacion: puntuacionSimulada
      });

      res.json({
        message: "Retroalimentación generada correctamente",
        retroalimentacion: retroalimentacionSimulada,
        puntuacion: puntuacionSimulada
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 📊 Finalizar entrevista y generar resultado final
  static async finalizarEntrevista(req, res) {
    try {
      const { entrevistaId } = req.params;
      const alumnoId = req.user.id;

      const entrevista = await Entrevista.findOne({
        where: { id: entrevistaId, alumnoId },
        include: [
          {
            model: RespuestaEntrevista,
            as: 'respuestas'
          }
        ]
      });

      if (!entrevista) {
        return res.status(404).json({ error: "Entrevista no encontrada" });
      }

      // Calcular promedio de puntuaciones
      const puntuaciones = entrevista.respuestas
        .filter(r => r.puntuacion !== null)
        .map(r => r.puntuacion);

      if (puntuaciones.length === 0) {
        return res.status(400).json({ 
          error: "No hay respuestas puntuadas para calcular el resultado" 
        });
      }

      const promedio = puntuaciones.reduce((a, b) => a + b, 0) / puntuaciones.length;
      
      // Generar resultado final basado en promedio
      let resultadoFinal;
      if (promedio >= 8.5) resultadoFinal = "Excelente";
      else if (promedio >= 7) resultadoFinal = "Bueno";
      else if (promedio >= 5.5) resultadoFinal = "Regular";
      else resultadoFinal = "Necesita mejorar";

      // Actualizar entrevista
      await entrevista.update({
        promedio_puntuacion: parseFloat(promedio.toFixed(2)),
        resultado_final: resultadoFinal
      });

      // Crear registro en historial
      await HistorialEntrevista.create({
        entrevistaId: entrevista.id,
        resultado: resultadoFinal
      });

      res.json({
        message: "Entrevista finalizada correctamente",
        resultado: {
          promedio_puntuacion: promedio.toFixed(2),
          resultado_final: resultadoFinal,
          total_preguntas: entrevista.respuestas.length,
          puntuaciones
        }
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 📋 RF-108: Obtener historial de entrevistas
  static async obtenerHistorial(req, res) {
    try {
      const alumnoId = req.user.id;

      const entrevistas = await Entrevista.findAll({
        where: { alumnoId },
        include: [
          {
            model: RespuestaEntrevista,
            as: 'respuestas',
            include: [
              {
                model: PreguntaEntrevista,
                as: 'pregunta'
              }
            ]
          },
          {
            model: HistorialEntrevista,
            as: 'historial'
          }
        ],
        order: [['fecha', 'DESC']]
      });

      res.json({ entrevistas });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 🎲 Obtener pregunta aleatoria (para testing)
  static async obtenerPreguntaAleatoria(req, res) {
    try {
      const pregunta = await PreguntaEntrevista.findOne({
        order: require('sequelize').literal('random()')
      });

      if (!pregunta) {
        return res.status(404).json({ 
          error: "No hay preguntas disponibles" 
        });
      }

      res.json({ pregunta });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

}

module.exports = EntrevistaController;