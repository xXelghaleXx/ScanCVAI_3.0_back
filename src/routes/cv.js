const express = require("express");
const router = express.Router();
const CVController = require("../controllers/CVController");
const authMiddleware = require("../middlewares/authMiddleware");
const { uploadCV, cleanupOnError } = require("../middlewares/uploadMiddleware");
const { validateCVProcessing, validateIdParam, simpleRateLimit } = require("../middlewares/validationMiddleware");

// 🔒 Todas las rutas requieren autenticación
router.use(authMiddleware);

// 📄 RF-100: Subir CV (con rate limiting específico)
router.post("/upload", 
  simpleRateLimit(10, 60 * 1000), // 10 uploads por minuto
  uploadCV,
  cleanupOnError,
  CVController.subirCV
);

// 🧠 RF-102: Procesar CV con IA
router.post("/:cvId/procesar", 
  validateCVProcessing,
  simpleRateLimit(5, 60 * 1000), // 5 procesamientos por minuto
  CVController.procesarCV
);

// 📊 RF-103: Generar informe detallado
router.post("/:cvId/informe", 
  validateIdParam('cvId'),
  simpleRateLimit(5, 60 * 1000), // 5 informes por minuto
  CVController.generarInforme
);

// 📋 Obtener todos los CVs del alumno logueado
router.get("/", CVController.obtenerCVs);

// 🗑️ Eliminar CV
router.delete("/:cvId", 
  validateIdParam('cvId'),
  CVController.eliminarCV
);

module.exports = router;