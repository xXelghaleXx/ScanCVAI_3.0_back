const express = require("express");
const router = express.Router();
const EntrevistaController = require("../controllers/EntrevistaController");
const authMiddleware = require("../middlewares/authMiddleware");
const { simpleRateLimit } = require("../middlewares/validationMiddleware");

// 🔒 Todas las rutas requieren autenticación
router.use(authMiddleware);

// 🎯 Iniciar nueva entrevista con IA
router.post("/iniciar", 
  simpleRateLimit(10, 60 * 1000), // 10 por minuto
  EntrevistaController.iniciarEntrevista
);

// 💬 Enviar mensaje en la entrevista (chat)
router.post("/:entrevistaId/mensaje", 
  simpleRateLimit(30, 60 * 1000), // 30 mensajes por minuto
  EntrevistaController.enviarMensaje
);

// 📊 Finalizar entrevista y obtener evaluación
router.post("/:entrevistaId/finalizar", 
  EntrevistaController.finalizarEntrevista
);

// 🗑️ Abandonar/Cancelar entrevista
router.post("/:entrevistaId/abandonar",
  EntrevistaController.abandonarEntrevista
);

// 📋 Obtener historial completo de una entrevista específica
router.get("/:entrevistaId/historial", 
  EntrevistaController.obtenerHistorial
);

// 📋 Obtener todas las entrevistas del alumno
router.get("/", 
  EntrevistaController.obtenerTodasEntrevistas
);

// 📊 Obtener estadísticas de entrevistas
router.get("/estadisticas/resumen",
  EntrevistaController.obtenerEstadisticas
);

module.exports = router;