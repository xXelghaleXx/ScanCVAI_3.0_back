const fs = require('fs');
const path = require('path');
const utilsService = require('./UtilsService');

class LoggerService {
  constructor() {
    this.logDir = 'logs';
    this.createLogDirectory();
    this.currentDate = new Date().toISOString().split('T')[0];
  }

  // 📁 Crear directorio de logs
  createLogDirectory() {
    utilsService.ensureDirectoryExists(this.logDir);
  }

  // 📝 Log genérico
  log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...metadata
    };

    // Console output con colores
    this.consoleLog(level, logEntry);
    
    // Escribir a archivo
    this.writeToFile(level, logEntry);
  }

  // 🖥️ Log a consola con colores
  consoleLog(level, logEntry) {
    const colors = {
      error: '\x1b[31m',   // Rojo
      warn: '\x1b[33m',    // Amarillo
      info: '\x1b[34m',    // Azul
      success: '\x1b[32m', // Verde
      debug: '\x1b[35m',   // Magenta
      reset: '\x1b[0m'     // Reset
    };

    const color = colors[level] || colors.info;
    const prefix = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      success: '✅',
      debug: '🔍'
    }[level] || 'ℹ️';

    console.log(
      `${color}${prefix} [${logEntry.timestamp}] ${logEntry.level}: ${logEntry.message}${colors.reset}`
    );

    // Mostrar metadata si existe
    if (Object.keys(logEntry).length > 3) {
      const metadata = { ...logEntry };
      delete metadata.timestamp;
      delete metadata.level;
      delete metadata.message;
      console.log(`${color}   Metadata:${colors.reset}`, metadata);
    }
  }

  // 💾 Escribir a archivo
  writeToFile(level, logEntry) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `${date}.log`;
    const filepath = path.join(this.logDir, filename);
    
    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      fs.appendFileSync(filepath, logLine);
    } catch (error) {
      console.error('Error escribiendo log:', error);
    }
  }

  // Métodos específicos por nivel
  error(message, error = null, metadata = {}) {
    const errorMetadata = {
      ...metadata
    };

    if (error) {
      errorMetadata.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    this.log('error', message, errorMetadata);
  }

  warn(message, metadata = {}) {
    this.log('warn', message, metadata);
  }

  info(message, metadata = {}) {
    this.log('info', message, metadata);
  }

  success(message, metadata = {}) {
    this.log('success', message, metadata);
  }

  debug(message, metadata = {}) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, metadata);
    }
  }

  // 🎯 Logs específicos para la aplicación

  // CV Events
  cvUploaded(userId, filename, size) {
    this.success('CV subido exitosamente', {
      userId,
      filename,
      size,
      category: 'cv'
    });
  }

  cvProcessed(userId, cvId, processingTime) {
    this.info('CV procesado con IA', {
      userId,
      cvId,
      processingTime,
      category: 'cv'
    });
  }

  cvAnalysisFailed(userId, cvId, error) {
    this.error('Falló análisis de CV', error, {
      userId,
      cvId,
      category: 'cv'
    });
  }

  // Interview Events
  interviewStarted(userId, entrevistaId) {
    this.info('Entrevista iniciada', {
      userId,
      entrevistaId,
      category: 'interview'
    });
  }

  interviewCompleted(userId, entrevistaId, score, duration) {
    this.success('Entrevista completada', {
      userId,
      entrevistaId,
      score,
      duration,
      category: 'interview'
    });
  }

  // Auth Events
  userRegistered(userId, email) {
    this.success('Usuario registrado', {
      userId,
      email,
      category: 'auth'
    });
  }

  userLogin(userId, email, method = 'traditional') {
    this.info('Usuario autenticado', {
      userId,
      email,
      method,
      category: 'auth'
    });
  }

  loginFailed(email, reason) {
    this.warn('Intento de login fallido', {
      email,
      reason,
      category: 'auth'
    });
  }

  // AI Events
  aiRequestSent(userId, service, prompt_length) {
    this.info('Solicitud enviada a IA', {
      userId,
      service,
      prompt_length,
      category: 'ai'
    });
  }

  aiResponseReceived(userId, service, response_length, processing_time) {
    this.success('Respuesta recibida de IA', {
      userId,
      service,
      response_length,
      processing_time,
      category: 'ai'
    });
  }

  aiError(userId, service, error) {
    this.error('Error en servicio de IA', error, {
      userId,
      service,
      category: 'ai'
    });
  }

  // API Events
  apiRequest(method, endpoint, userId, statusCode, responseTime) {
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `${method} ${endpoint} - ${statusCode}`, {
      userId,
      method,
      endpoint,
      statusCode,
      responseTime,
      category: 'api'
    });
  }

  // System Events
  serverStarted(port) {
    this.success(`🚀 Servidor iniciado en puerto ${port}`, {
      port,
      category: 'system'
    });
  }

  databaseConnected() {
    this.success('✅ Base de datos conectada', {
      category: 'system'
    });
  }

  databaseError(error) {
    this.error('❌ Error de base de datos', error, {
      category: 'system'
    });
  }

  // 📊 Middleware de logging para Express
  expressMiddleware() {
    return (req, res, next) => {
      const start = Date.now();
      
      // Capturar respuesta
      const originalSend = res.send;
      res.send = function(body) {
        const duration = Date.now() - start;
        
        // Log de la request
        logger.apiRequest(
          req.method,
          req.originalUrl,
          req.user?.id || 'anonymous',
          res.statusCode,
          duration
        );
        
        return originalSend.call(this, body);
      };
      
      next();
    };
  }

  // 📈 Obtener estadísticas de logs
  async getLogStats(date = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const filepath = path.join(this.logDir, `${targetDate}.log`);
      
      if (!fs.existsSync(filepath)) {
        return { date: targetDate, stats: null };
      }
      
      const content = fs.readFileSync(filepath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line);
      
      const stats = {
        total: lines.length,
        by_level: {},
        by_category: {},
        errors: 0,
        warnings: 0
      };
      
      lines.forEach(line => {
        try {
          const entry = JSON.parse(line);
          
          // Contar por nivel
          stats.by_level[entry.level] = (stats.by_level[entry.level] || 0) + 1;
          
          // Contar por categoría
          if (entry.category) {
            stats.by_category[entry.category] = (stats.by_category[entry.category] || 0) + 1;
          }
          
          // Contar errores y warnings
          if (entry.level === 'ERROR') stats.errors++;
          if (entry.level === 'WARN') stats.warnings++;
          
        } catch (e) {
          // Ignorar líneas malformadas
        }
      });
      
      return { date: targetDate, stats };
      
    } catch (error) {
      this.error('Error obteniendo estadísticas de logs', error);
      return { date: targetDate, stats: null };
    }
  }

  // 🧹 Limpiar logs antiguos
  cleanOldLogs(daysToKeep = 30) {
    try {
      const files = fs.readdirSync(this.logDir);
      const now = new Date();
      
      files.forEach(file => {
        if (!file.endsWith('.log')) return;
        
        const filepath = path.join(this.logDir, file);
        const stats = fs.statSync(filepath);
        const fileAge = (now - stats.mtime) / (1000 * 60 * 60 * 24);
        
        if (fileAge > daysToKeep) {
          fs.unlinkSync(filepath);
          this.info(`Log antiguo eliminado: ${file}`, { 
            age_days: Math.floor(fileAge),
            category: 'maintenance' 
          });
        }
      });
      
    } catch (error) {
      this.error('Error limpiando logs antiguos', error);
    }
  }

  // 🧪 Test del logger
  runTest() {
    console.log('🧪 Probando sistema de logging...');
    
    this.info('Test de logging iniciado');
    this.success('Test exitoso');
    this.warn('Test de advertencia');
    this.debug('Test de debug');
    this.error('Test de error', new Error('Error de prueba'));
    
    // Tests específicos
    this.cvUploaded(123, 'test-cv.pdf', '2.5MB');
    this.userLogin(123, 'test@email.com', 'google');
    this.aiRequestSent(123, 'llama', 150);
    
    console.log('✅ Test de logging completado');
    return true;
  }

}

// Singleton instance
const logger = new LoggerService();

module.exports = logger;