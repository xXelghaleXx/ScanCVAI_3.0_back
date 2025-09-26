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
  
  // Incrementar métricas de error
  metrics.errors.total++;
  const errorType = err.name || 'UnknownError';
  metrics.errors.by_type[errorType] = (metrics.errors.by_type[errorType] || 0) + 1;
  
  // Log detallado del error
  logger.error('Error global capturado', err, {
    error_id: errorId,
    method: req.method,
    endpoint: req.originalUrl,
    user_id: req.user?.id || 'anonymous',
    user_agent: req.get('User-Agent'),
    ip: req.ip,
    body: req.method === 'POST' ? req.body : undefined
  });
  
  // Determinar código de estado
  let statusCode = 500;
  let message = 'Error interno del servidor';
  
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Datos de entrada inválidos';
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'No autorizado';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Acceso denegado';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Recurso no encontrado';
  }
  
  // Respuesta de error
  const errorResponse = {
    error: message,
    error_id: errorId,
    timestamp: new Date().toISOString()
  };
  
  // En desarrollo, incluir stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = {
      message: err.message,
      stack: err.stack,
      name: err.name
    };
  }
  
  res.status(statusCode).json(errorResponse);
};

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