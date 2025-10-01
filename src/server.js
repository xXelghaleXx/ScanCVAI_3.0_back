const express = require("express");
const cors = require("cors"); // ← AGREGAR ESTA LÍNEA
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

// ========== CONFIGURACIÓN CORS (AGREGAR DESPUÉS DE CREAR APP) ==========
const corsOptions = {
  origin: [
    'http://localhost:5173',    // Vite dev server (React)
    'http://127.0.0.1:5173',   // Alternativa localhost
    'http://localhost:3000',   // Self-origin si es necesario
    'http://localhost:4173',   // Vite preview
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []), // URL desde .env
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []) // URLs adicionales desde .env
  ],
  credentials: true,           // Permitir cookies y auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['Authorization'], // Headers que el frontend puede leer
  optionsSuccessStatus: 200,   // Para browsers legacy (IE11)
  maxAge: 86400 // Cache preflight por 24 horas
};

// ✅ APLICAR CORS ANTES DE CUALQUIER OTRO MIDDLEWARE
app.use(cors(corsOptions));

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

// 📝 Logging de requests (incluir CORS info)
app.use((req, res, next) => {
  // Log CORS info para debug
  if (req.headers.origin) {
    logger.debug(`CORS request from: ${req.headers.origin}`, {
      method: req.method,
      path: req.path,
      origin: req.headers.origin,
      userAgent: req.headers['user-agent']
    });
  }
  next();
});

app.use(logger.expressMiddleware());

// 🔌 Rutas principales
app.use("/api/auth", require("./routes/auth"));
app.use("/api/cv", require("./routes/cv"));
app.use("/api/entrevistas", require("./routes/entrevistas"));
app.use("/api/carreras", require("./routes/carreras"));
app.use("/api/informes", require("./routes/informes"));
app.use("/api/habilidades", require("./routes/habilidades"));
app.use("/api/preguntas", require("./routes/preguntas"));
app.use("/api/dashboard", require("./routes/dashboard"));

// 📊 Ruta de métricas (protegida)
app.get("/api/metrics", authMiddleware, metricsEndpoint);

// 🏠 Ruta de salud (MEJORADA con info de CORS)
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
      utils: "ready",
      cors: "configured" // ← AGREGAR INFO DE CORS
    };

    const allHealthy = Object.values(services).every(status => 
      status === "connected" || status === "ready" || status === "active" || status === "configured"
    );

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "healthy" : "degraded",
      services,
      cors: {
        allowedOrigins: corsOptions.origin,
        requestOrigin: req.headers.origin || 'none',
        isAllowed: corsOptions.origin.includes(req.headers.origin || '')
      },
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
        llama: await llamaService.testConnection(),
        cors: {
          configured: true,
          allowedOrigins: corsOptions.origin,
          requestOrigin: req.headers.origin || 'direct'
        }
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

  // 🧪 Ruta adicional para test de CORS específico
  app.get("/api/cors-test", (req, res) => {
    res.json({
      message: "CORS test successful",
      origin: req.headers.origin,
      method: req.method,
      headers: req.headers,
      corsConfig: {
        allowedOrigins: corsOptions.origin,
        credentials: corsOptions.credentials,
        methods: corsOptions.methods
      },
      timestamp: new Date().toISOString()
    });
  });
}

// 🚫 Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint no encontrado",
    method: req.method,
    path: req.originalUrl,
    origin: req.headers.origin || 'direct',
    timestamp: new Date().toISOString()
  });
});

// 🚨 Middleware global de manejo de errores (debe ir al final)
app.use(globalErrorHandler);

const PORT = process.env.PORT || 3000;

// 🚀 Función de inicialización (MEJORADA)
const initializeServer = async () => {
  try {
    // 1. Log configuración CORS
    logger.info("🌐 Configurando CORS...", {
      allowedOrigins: corsOptions.origin,
      credentials: corsOptions.credentials,
      methods: corsOptions.methods.join(', ')
    });

    // 2. Sincronizar base de datos
    logger.info("🔄 Sincronizando base de datos...");
    await syncModels({ alter: true });
    logger.databaseConnected();

    // 3. Verificar servicios
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

    // 4. Ejecutar tests en desarrollo
    if (process.env.NODE_ENV === 'development') {
      logger.info("🧪 Ejecutando tests de servicios...");
      utilsService.runTests();
      await fileExtractorService.testExtraction();
    }

    // 5. Iniciar servidor
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
║  🌐 CORS Test: http://localhost:${PORT}/api/cors-test         ║
║                                                               ║
║  Servicios:                                                   ║
║  ${llamaStatus.connected ? '✅' : '⚠️'} Llama 3.1 (${llamaStatus.connected ? 'Conectado' : 'Desconectado'})                         ║
║  ✅ Base de datos PostgreSQL                                 ║
║  ✅ Upload de archivos                                        ║
║  ✅ Logging y monitoreo                                       ║
║  🌐 CORS configurado para: ${corsOptions.origin.length} orígenes      ║
║                                                               ║
║  📝 Logs: ./logs/                                            ║
║  📁 Uploads: ./uploads/cvs/                                  ║
╚═══════════════════════════════════════════════════════════════╝
      `);

      // Log resumen de rutas disponibles (ACTUALIZADO)
      logger.info("📋 API Endpoints disponibles", {
        auth: "POST /api/auth/{register,login,google,refresh,logout}",
        cv: "GET,POST,DELETE /api/cv + procesamiento IA",
        entrevistas: "POST /api/entrevistas + chat IA",
        informes: "GET /api/informes + generación PDF",
        dashboard: "GET /api/dashboard + analytics",
        system: "GET /api/{health,metrics,test,cors-test}",
        cors_origins: corsOptions.origin.join(', '),
        category: "startup"
      });

      // Advertencia si no hay FRONTEND_URL configurada
      if (!process.env.FRONTEND_URL) {
        logger.warn("⚠️ FRONTEND_URL no configurada en .env - usando valores por defecto");
      }
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