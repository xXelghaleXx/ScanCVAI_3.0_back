const express = require("express");
const router = express.Router();
const InformeController = require("./informe.controller");
const authMiddleware = require("../../shared/middlewares/auth.middleware");

// 🔒 Todas las rutas requieren autenticación
router.use(authMiddleware);

// 📊 RF-107: Obtener informe detallado específico
router.get("/:informeId", InformeController.obtenerInforme);

// 📋 RF-107: Obtener todos los informes del alumno
router.get("/", InformeController.obtenerInformesAlumno);

// ✉️ RF-107: Enviar informe por correo electrónico
router.post("/:informeId/enviar-email", InformeController.enviarInformePorCorreo);

// 📥 RF-107: Descargar informe en PDF
router.get("/:informeId/pdf", InformeController.descargarInformePDF);

// 🗑️ Eliminar informe
router.delete("/:informeId", InformeController.eliminarInforme);

// 📈 Obtener estadísticas de informes del alumno
router.get("/estadisticas/resumen", InformeController.obtenerEstadisticas);

module.exports = router;