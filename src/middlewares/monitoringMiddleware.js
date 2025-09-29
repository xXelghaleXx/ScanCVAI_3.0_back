const logger = require('../services/LoggerService');
const utilsService = require('../services/UtilsService');

// 📊 Métricas en memoria
const metrics = {
  requests: {
    total: 0,
    by_method: {},
    by_endpoint: {},
    by_status: {},
    response_times: []
  },
  errors: {
    total: 0,
    by_type: {},
    recent: []
  },
  users: {
    active_sessions: new Set(),
    requests_by_user: {}
  },
  ai: {
    requests: 0,
    avg_response_time: 0,
    errors: 0
  }
};

// 🕐 Middleware de monitoreo de performance
const performanceMonitoring = (req, res, next) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  // Incrementar contador total
  metrics.requests.total++;
  
  // Contar por método
  metrics.requests.by_method[req.method] = (metrics.requests.by_method[req.method] || 0) + 1;
  
  // Contar por endpoint
  const endpoint = req.route ? req.route.path : req.path;
  metrics.requests.by_endpoint[endpoint] = (metrics.requests.by_endpoint[endpoint] || 0) + 1;
  
  // Trackear usuario activo
  if (req.user?.id) {
    metrics.users.active_sessions.add(req.user.id);
    metrics.users.requests_by_user[req.user.id] = (metrics.users.requests_by_user[req.user.id] || 0) + 1;
  }
  
  // Capturar respuesta
  const originalSend = res.send;
  const originalJson = res.json;
  
  const interceptResponse = function(body) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const endMemory = process.memoryUsage();
    
    // Métricas de respuesta
    metrics.requests.by_status[res.statusCode] = (metrics.requests.by_status[res.statusCode] || 0) + 1;
    metrics.requests.response_times.push(responseTime);
    
    // Mantener solo los últimos 1000 tiempos de respuesta
    if (metrics.requests.response_times.length > 1000) {
      metrics.requests.response_times = metrics.requests.response_times.slice(-1000);
    }
    
    // Log de requests lentas (>2 segundos)
    if (responseTime > 2000) {
      logger.warn('Request lenta detectada', {
        method: req.method,
        endpoint,
        response_time: responseTime,
        status_code: res.statusCode,
        user_id: req.user?.id || 'anonymous',
        memory_delta: {
          heap_used: endMemory.heapUsed - startMemory.heapUsed,
          rss: endMemory.rss - startMemory.rss
        }
      });
    }
    
    // Log de errores HTTP
    if (res.statusCode >= 400) {
      metrics.errors.total++;
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      metrics.errors.by_type[errorType] = (metrics.errors.by_type[errorType] || 0) + 1;
      
      // Guardar errores recientes
      metrics.errors.recent.push({
        timestamp: new Date().toISOString(),
        method: req.method,
        endpoint,
        status_code: res.statusCode,
        user_id: req.user?.id || 'anonymous',
        response_time: responseTime
      });
      
      // Mantener solo los últimos 50 errores
      if (metrics.errors.recent.length > 50) {
        metrics.errors.recent = metrics.errors.recent.slice(-50);
      }
    }
    
    return body;
  };
  
  res.send = function(body) {
    const result = interceptResponse(body);
    return originalSend.call(this, result || body);
  };
  
  res.json = function(body) {
    const result = interceptResponse(body);
    return originalJson.call(this, result || body);
  };
  
  next();
};

// 🚨 Middleware de manejo de errores globales
const globalErrorHandler = (err, req, res, next) => {
  const errorId = utilsService.generateUniqueId();
  const startTime = Date.now();
  
  try {
    // Incrementar métricas de error
    metrics.errors.total++;
    const errorType = err.name || 'UnknownError';
    metrics.errors.by_type[errorType] = (metrics.errors.by_type[errorType] || 0) + 1;

    // Clasificación detallada de errores
    const errorDetails = classifyError(err);
    const { statusCode, errorCode, message, severity } = errorDetails;

    // Enriquecer información del error
    const enrichedError = {
      error_id: errorId,
      timestamp: new Date().toISOString(),
      request: {
        method: req.method,
        path: req.originalUrl,
        query: req.query,
        body: shouldLogRequestBody(req) ? sanitizeRequestBody(req.body) : undefined,
        headers: sanitizeHeaders(req.headers),
        ip: req.ip,
        user_agent: req.get('User-Agent')
      },
      user: {
        id: req.user?.id || 'anonymous',
        roles: req.user?.roles,
        session_id: req.sessionID
      },
      error: {
        type: errorType,
        code: errorCode,
        message: err.message,
        severity,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      },
      context: {
        environment: process.env.NODE_ENV,
        node_version: process.version,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    // Log según severidad
    switch (severity) {
      case 'critical':
        logger.error('Error crítico detectado', enrichedError);
        notifyAdmins(enrichedError); // Función hipotética para notificar a administradores
        break;
      case 'high':
        logger.error('Error grave detectado', enrichedError);
        break;
      case 'medium':
        logger.warn('Error detectado', enrichedError);
        break;
      default:
        logger.info('Error menor detectado', enrichedError);
    }

    // Construir respuesta para el cliente
    const clientResponse = {
      error: {
        message,
        code: errorCode,
        id: errorId
      },
      status: 'error',
      timestamp: new Date().toISOString()
    };

    // En desarrollo, incluir más detalles
    if (process.env.NODE_ENV === 'development') {
      clientResponse.debug = {
        error_type: errorType,
        stack: err.stack,
        request_path: req.originalUrl,
        processing_time: Date.now() - startTime
      };
    }

    // Registrar métricas adicionales
    updateErrorMetrics(errorDetails, startTime);

    // Enviar respuesta
    return res.status(statusCode).json(clientResponse);

  } catch (handlingError) {
    // Error durante el manejo del error
    logger.error('Error crítico en el manejador de errores', {
      original_error: err,
      handling_error: handlingError,
      error_id: errorId
    });

    // Respuesta de último recurso
    return res.status(500).json({
      error: {
        message: 'Error interno del servidor',
        id: errorId
      },
      status: 'error',
      timestamp: new Date().toISOString()
    });
  }
};

// 🔍 Clasificar y enriquecer información del error
function classifyError(err) {
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'Error interno del servidor';
  let severity = 'medium';

  // Errores de validación
  if (err.name === 'ValidationError' || err.name === 'SequelizeValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Datos de entrada inválidos';
    severity = 'low';
  }
  // Errores de autenticación
  else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'AUTH_ERROR';
    message = 'No autorizado';
    severity = 'medium';
  }
  // Token expirado
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Sesión expirada';
    severity = 'low';
  }
  // Errores de permisos
  else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    message = 'Acceso denegado';
    severity = 'medium';
  }
  // Recursos no encontrados
  else if (err.name === 'NotFoundError' || err.name === 'SequelizeEmptyResultError') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = 'Recurso no encontrado';
    severity = 'low';
  }
  // Errores de base de datos
  else if (err.name === 'SequelizeDatabaseError') {
    statusCode = 500;
    errorCode = 'DATABASE_ERROR';
    message = 'Error de base de datos';
    severity = 'high';
  }
  // Errores de conexión
  else if (err.name === 'ConnectionError' || err.code === 'ECONNREFUSED') {
    statusCode = 503;
    errorCode = 'SERVICE_UNAVAILABLE';
    message = 'Servicio no disponible';
    severity = 'critical';
  }
  // Timeout
  else if (err.name === 'TimeoutError' || err.code === 'ETIMEDOUT') {
    statusCode = 504;
    errorCode = 'TIMEOUT';
    message = 'Tiempo de espera agotado';
    severity = 'high';
  }

  return { statusCode, errorCode, message, severity };
}

// 🧹 Sanitizar headers sensibles
function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

// 🧹 Sanitizar body de la petición
function sanitizeRequestBody(body) {
  if (!body) return undefined;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'api_key'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

// 📊 Actualizar métricas de error
function updateErrorMetrics(errorDetails, startTime) {
  const processingTime = Date.now() - startTime;
  
  metrics.errors.recent.push({
    timestamp: new Date().toISOString(),
    type: errorDetails.errorCode,
    severity: errorDetails.severity,
    processing_time: processingTime
  });
  
  // Mantener solo los últimos 100 errores
  if (metrics.errors.recent.length > 100) {
    metrics.errors.recent = metrics.errors.recent.slice(-100);
  }
  
  // Actualizar contadores por tipo
  metrics.errors.by_type[errorDetails.errorCode] = 
    (metrics.errors.by_type[errorDetails.errorCode] || 0) + 1;
}

// 🔍 Determinar si se debe logear el body
function shouldLogRequestBody(req) {
  // No logear bodies de archivos o muy grandes
  const contentType = req.get('Content-Type');
  const contentLength = parseInt(req.get('Content-Length') || '0');
  
  if (contentType?.includes('multipart/form-data')) return false;
  if (contentLength > 10000) return false; // No logear bodies > 10KB
  
  return req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH';
}

// 🔍 Middleware de detección de anomalías
const anomalyDetection = (req, res, next) => {
  const now = Date.now();
  const userId = req.user?.id;
  
  if (userId) {
    const userRequests = metrics.users.requests_by_user[userId] || 0;
    
    // Detectar posible abuso (más de 100 requests por usuario)
    if (userRequests > 100) {
      logger.warn('Posible abuso detectado', {
        user_id: userId,
        total_requests: userRequests,
        endpoint: req.originalUrl
      });
    }
  }
  
  // Detectar picos de tráfico
  const recentRequests = metrics.requests.response_times.length;
  if (recentRequests > 0 && recentRequests % 100 === 0) {
    const avgResponseTime = utilsService.calculateStats(metrics.requests.response_times.slice(-100));
    
    if (avgResponseTime && avgResponseTime.average > 1000) {
      logger.warn('Pico de latencia detectado', {
        recent_requests: recentRequests,
        avg_response_time: avgResponseTime.average,
        max_response_time: avgResponseTime.max
      });
    }
  }
  
  next();
};

// 📊 Obtener métricas actuales
const getMetrics = () => {
  const responseTimeStats = utilsService.calculateStats(metrics.requests.response_times);
  
  return {
    requests: {
      ...metrics.requests,
      response_time_stats: responseTimeStats,
      requests_per_minute: calculateRequestsPerMinute()
    },
    errors: {
      ...metrics.errors,
      error_rate: metrics.requests.total > 0 ? 
        ((metrics.errors.total / metrics.requests.total) * 100).toFixed(2) + '%' : '0%'
    },
    users: {
      active_sessions: metrics.users.active_sessions.size,
      total_user_requests: Object.keys(metrics.users.requests_by_user).length,
      most_active_users: getMostActiveUsers()
    },
    ai: metrics.ai,
    system: {
      memory_usage: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  };
};

// 📈 Calcular requests por minuto
const calculateRequestsPerMinute = () => {
  // Esta es una aproximación simple, en producción usar sliding window
  const now = Date.now();
  const oneMinuteAgo = now - (60 * 1000);
  
  // Por simplicidad, asumimos distribución uniforme
  return Math.round(metrics.requests.total / (process.uptime() / 60));
};

// 👥 Obtener usuarios más activos
const getMostActiveUsers = (limit = 5) => {
  return Object.entries(metrics.users.requests_by_user)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([userId, requests]) => ({ user_id: userId, requests }));
};

// 🧹 Limpiar métricas antiguas
const cleanupMetrics = () => {
  // Limpiar usuarios inactivos (sin requests en la última hora)
  metrics.users.active_sessions.clear();
  
  // Limpiar errores antiguos (más de 1 hora)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  metrics.errors.recent = metrics.errors.recent.filter(
    error => new Date(error.timestamp).getTime() > oneHourAgo
  );
  
  logger.info('Métricas limpiadas', {
    category: 'monitoring'
  });
};

// 📊 Endpoint para exponer métricas
const metricsEndpoint = (req, res) => {
  try {
    const metrics = getMetrics();
    res.json({
      success: true,
      data: metrics,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error obteniendo métricas', error);
    res.status(500).json({
      error: 'Error interno obteniendo métricas'
    });
  }
};

// 🔄 Programar limpieza automática cada 30 minutos
setInterval(cleanupMetrics, 30 * 60 * 1000);

// 📊 Log periódico de métricas (cada 15 minutos)
setInterval(() => {
  const currentMetrics = getMetrics();
  logger.info('Métricas del sistema', {
    total_requests: currentMetrics.requests.total,
    error_rate: currentMetrics.errors.error_rate,
    avg_response_time: currentMetrics.requests.response_time_stats?.average,
    active_sessions: currentMetrics.users.active_sessions,
    memory_heap: Math.round(currentMetrics.system.memory_usage.heapUsed / 1024 / 1024) + 'MB',
    category: 'metrics'
  });
}, 15 * 60 * 1000);

module.exports = {
  performanceMonitoring,
  globalErrorHandler,
  anomalyDetection,
  getMetrics,
  metricsEndpoint,
  cleanupMetrics,
  
  // Para testing
  __getInternalMetrics: () => metrics
};