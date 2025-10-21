const express = require("express");
const router = express.Router();
const CVController = require("./cv.controller");
const authMiddleware = require("../../shared/middlewares/auth.middleware");
const { uploadCV, cleanupOnError } = require("../../shared/middlewares/upload.middleware");
const { validateCVProcessing, validateIdParam, simpleRateLimit } = require("../../shared/middlewares/validation.middleware");

// 🔒 Todas las rutas requieren autenticación
router.use(authMiddleware);

// 📄 RF-100: Subir CV (con rate limiting específico)
router.post("/upload", 
  simpleRateLimit(10, 60 * 1000),
  uploadCV,
  cleanupOnError,
  CVController.subirCV
);

// 🧠 RF-102: Procesar CV con IA
router.post("/:cvId/procesar", 
  validateCVProcessing,
  simpleRateLimit(5, 60 * 1000),
  CVController.procesarCV
);

// 📊 RF-103: Generar informe detallado
router.post("/:cvId/informe", 
  validateIdParam('cvId'),
  simpleRateLimit(5, 60 * 1000),
  CVController.generarInforme
);

// ✨ NUEVAS RUTAS DE HISTORIAL

// 📋 Obtener historial completo paginado
router.get("/historial", CVController.obtenerHistorialCompleto);

// 📈 Estadísticas detalladas del historial
router.get("/historial/estadisticas", CVController.obtenerEstadisticasHistorial);

// 🔍 Buscar en el historial
router.get("/historial/buscar", CVController.buscarEnHistorial);

// 📥 Exportar historial completo
router.get("/historial/exportar", CVController.exportarHistorial);

// 📊 Comparar dos CVs
router.get("/historial/comparar", CVController.compararCVs);

// 📋 Obtener todos los CVs del alumno (simple)
router.get("/", CVController.obtenerCVs);

// 🗑️ Eliminar CV
router.delete("/:cvId", 
  validateIdParam('cvId'),
  CVController.eliminarCV
);

module.exports = router;