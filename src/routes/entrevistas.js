const express = require("express");
const router = express.Router();
const EntrevistaController = require("../controllers/EntrevistaController");
const authMiddleware = require("../middlewares/authMiddleware");

// 🔒 Todas las rutas requieren autenticación
router.use(authMiddleware);

// 🎯 RF-104: Iniciar nueva entrevista
router.post("/iniciar", EntrevistaController.iniciarEntrevista);

// 💬 RF-104: Responder pregunta de entrevista
router.post("/:entrevistaId/responder", EntrevistaController.responderPregunta);

// 🧠 RF-105: Procesar respuesta con IA (generar retroalimentación)
router.post("/respuestas/:respuestaId/procesar", EntrevistaController.procesarRespuesta);

// 📊 Finalizar entrevista y obtener resultado final
router.post("/:entrevistaId/finalizar", EntrevistaController.finalizarEntrevista);

// 📋 RF-108: Obtener historial de entrevistas del alumno
router.get("/historial", EntrevistaController.obtenerHistorial);

// 🎲 Obtener pregunta aleatoria (para testing)
router.get("/pregunta-aleatoria", EntrevistaController.obtenerPreguntaAleatoria);

module.exports = router;