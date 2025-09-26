const express = require("express");
const { syncModels } = require("./models");
const authMiddleware = require("./middlewares/authMiddleware");
const { performanceMonitoring, globalErrorHandler, anomalyDetection, metricsEndpoint } = require("./middlewares/monitoringMiddleware");
const { sanitizeInput, simpleRateLimit } = require("./middlewares/validationMiddleware");
const { cleanupOnError } = require("./middlewares/uploadMiddleware");
const logger = require("./services/LoggerService");
const llamaService = require("./services/LlamaService");
const fileExtractorService = require("./services/FileExtractorService");
const utilsService = require("./services/UtilsService");
require("dotenv").config();

const app = express();

// 🔧 Configuración básica
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 🛡️ Middlewares de seguridad y monitoreo
app.use(performanceMonitoring);
app.use(anomalyDetection);
app.use(sanitizeInput);
app.use(cleanupOnError);

// 📊 Rate limiting global (100 requests por 15 minutos)
app.use(simpleRateLimit(100, 15 * 60 * 1000));

// 📝 Logging de requests
app.use(logger.expressMiddleware());

// 🔌 Rutas principales
app.use("/api/auth", require("./routes/auth"));
app.use("/api/cv", require("./routes/cv"));
app.use("/api/entrevistas", require("./routes/entrevistas"));
app.use("/api/informes", require("./routes/informes"));
app.use("/api/habilidades", require("./routes/habilidades"));
app.use("/api/preguntas", require("./routes/preguntas"));
app.use("/api/dashboard", require("./routes/dashboard"));

// 📊 Ruta de métricas (protegida)
app.get("/api/metrics", authMiddleware, metricsEndpoint);

// 🏠 Ruta de salud
app.get("/api/health", async (req, res) => {
  try {
    // Verificar conexión con Llama
    const llamaStatus = await llamaService.checkConnection();
    
    // Verificar servicios
    const services = {
      database: "connected", // Se verifica en syncModels
      llama: llamaStatus.connected ? "connected" : "disconnected",
      file_extractor: "ready",
      logger: "active",
      utils: "ready"
    };

    const allHealthy = Object.values(services).every(status => 
      status === "connected" || status === "ready" || status === "active"
    );

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "healthy" : "degraded",
      services,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || "1.0.0"
    });

  } catch (error) {
    logger.error("Error en health check", error);
    res.status(503).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🧪 Ruta de test (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  app.get("/api/test", async (req, res) => {
    try {
      const tests = {
        logger: logger.runTest(),
        utils: utilsService.runTests(),
        file_extractor: await fileExtractorService.testExtraction(),
        llama: await llamaService.testConnection()
      };

      res.json({
        message: "Tests ejecutados",
        results: tests,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error("Error ejecutando tests", error);
      res.status(500).json({ error: error.message });
    }
  });
}

// 🚫 Manejo de rutas no encontradas
// ✅ Correcto - Catch-all para rutas no encontradas
// ✅ Manejo de rutas no encontradas (debe ir AL FINAL de todas las rutas)
// ✅ Alternativa válida
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint no encontrado",
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// 🚨 Middleware global de manejo de errores (debe ir al final)
app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;

// 🚀 Función de inicialización
const initializeServer = async () => {
  try {
    // 1. Sincronizar base de datos
    logger.info("🔄 Sincronizando base de datos...");
    await syncModels({ alter: true });
    logger.databaseConnected();

    // 2. Verificar servicios
    logger.info("🧪 Verificando servicios...");
    
    // Test Llama connection
    const llamaStatus = await llamaService.checkConnection();
    if (llamaStatus.connected) {
      logger.success("✅ Llama 3.1 conectado correctamente");
    } else {
      logger.warn("⚠️ Llama 3.1 no disponible - Funcionalidad de IA limitada", {
        error: llamaStatus.error
      });
    }

    // 3. Ejecutar tests en desarrollo
    if (process.env.NODE_ENV === 'development') {
      logger.info("🧪 Ejecutando tests de servicios...");
      utilsService.runTests();
      await fileExtractorService.testExtraction();
    }

    // 4. Iniciar servidor
    app.listen(PORT, () => {
      logger.serverStarted(PORT);
      
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  🎓 SISTEMA DE ANÁLISIS DE CV Y ENTREVISTAS                  ║
║                                                               ║
║  🚀 Servidor: http://localhost:${PORT}                        ║
║  📊 Health: http://localhost:${PORT}/api/health               ║
║  📈 Metrics: http://localhost:${PORT}/api/metrics             ║
║  🧪 Tests: http://localhost:${PORT}/api/test                  ║
║                                                               ║
║  Servicios:                                                   ║
║  ${llamaStatus.connected ? '✅' : '⚠️'} Llama 3.1 (${llamaStatus.connected ? 'Conectado' : 'Desconectado'})                         ║
║  ✅ Base de datos PostgreSQL                                 ║
║  ✅ Upload de archivos                                        ║
║  ✅ Logging y monitoreo                                       ║
║                                                               ║
║  📝 Logs: ./logs/                                            ║
║  📁 Uploads: ./uploads/cvs/                                  ║
╚═══════════════════════════════════════════════════════════════╝
      `);

      // Log resumen de rutas disponibles
      logger.info("📋 API Endpoints disponibles", {
        auth: "POST /api/auth/{register,login,google,refresh,logout}",
        cv: "GET,POST,DELETE /api/cv + procesamiento IA",
        entrevistas: "POST /api/entrevistas + chat IA",
        informes: "GET /api/informes + generación PDF",
        dashboard: "GET /api/dashboard + analytics",
        system: "GET /api/{health,metrics,test}",
        category: "startup"
      });
    });

  } catch (error) {
    logger.error("❌ Error crítico iniciando servidor", error);
    process.exit(1);
  }
};

// 🛑 Manejo de cierre graceful
process.on('SIGTERM', () => {
  logger.info("🛑 Señal SIGTERM recibida, cerrando servidor...");
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info("🛑 Señal SIGINT recibida, cerrando servidor...");
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error("💥 Excepción no capturada", error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error("💥 Promise rechazada no manejada", new Error(reason), {
    promise: promise.toString()
  });
  process.exit(1);
});

// 🚀 Inicializar servidor
initializeServer();