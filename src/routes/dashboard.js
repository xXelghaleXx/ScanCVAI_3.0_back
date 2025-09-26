const express = require("express");
const router = express.Router();
const DashboardController = require("../controllers/DashboardController");
const authMiddleware = require("../middlewares/authMiddleware");
const { simpleRateLimit } = require("../middlewares/validationMiddleware");

// 🔒 Todas las rutas requieren autenticación
router.use(authMiddleware);

// 📊 RF-108: Dashboard principal del alumno
router.get("/", DashboardController.obtenerDashboard);

// 📈 Estadísticas detalladas
router.get("/estadisticas", DashboardController.obtenerEstadisticasDetalladas);

// 🎯 Recomendaciones personalizadas
router.get("/recomendaciones", DashboardController.obtenerRecomendaciones);

// 🧠 Analytics avanzado (nuevo - limitado por rate limiting)
router.get("/analytics", 
  simpleRateLimit(10, 60 * 1000), // 10 requests por minuto
  DashboardController.obtenerAnalyticsAvanzado
);

module.exports = router;