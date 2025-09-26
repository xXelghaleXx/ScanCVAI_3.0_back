const { body, param, query, validationResult } = require('express-validator');

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Errores de validación',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// 📊 Validaciones para entrevistas
const validateEntrevistaRequest = [
  body('preguntaId')
    .isInt({ min: 1 })
    .withMessage('ID de pregunta debe ser un número entero positivo'),
  
  body('respuesta')
    .isLength({ min: 10, max: 2000 })
    .withMessage('La respuesta debe tener entre 10 y 2000 caracteres')
    .trim(),
  
  handleValidationErrors
];

// 📧 Validaciones para envío de email
const validateEmailRequest = [
  body('email_destino')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email de destino inválido'),
  
  body('mensaje')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Mensaje opcional no puede exceder 500 caracteres'),
  
  handleValidationErrors
];

// 🔍 Validaciones para búsquedas
const validateSearchQuery = [
  query('q')
    .isLength({ min: 2, max: 100 })
    .withMessage('Término de búsqueda debe tener entre 2 y 100 caracteres')
    .trim()
    .escape(),
  
  handleValidationErrors
];

// 📄 Validaciones para paginación
const validatePaginationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Número de página debe ser un entero positivo'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe estar entre 1 y 100'),
  
  handleValidationErrors
];

// 🆔 Validaciones para IDs en parámetros
const validateIdParam = (paramName = 'id') => [
  param(paramName)
    .isInt({ min: 1 })
    .withMessage(`${paramName} debe ser un número entero positivo`),
  
  handleValidationErrors
];

// 📊 Validaciones para procesar CV
const validateCVProcessing = [
  param('cvId')
    .isInt({ min: 1 })
    .withMessage('ID de CV debe ser un número entero positivo'),
  
  handleValidationErrors
];

// 🎯 Validaciones para finalizar entrevista
const validateFinalizarEntrevista = [
  param('entrevistaId')
    .isInt({ min: 1 })
    .withMessage('ID de entrevista debe ser un número entero positivo'),
  
  handleValidationErrors
];

// 🔐 Validaciones para registro de usuario
const validateUserRegistration = [
  body('nombre')
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre debe tener entre 2 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('Nombre solo puede contener letras y espacios')
    .trim(),
  
  body('correo')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  
  body('contrasena')
    .isLength({ min: 6, max: 255 })
    .withMessage('Contraseña debe tener al menos 6 caracteres'),
  
  handleValidationErrors
];

// 🔑 Validaciones para login
const validateUserLogin = [
  body('correo')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  
  body('contrasena')
    .notEmpty()
    .withMessage('Contraseña requerida'),
  
  body('client_id')
    .equals('frontend_app')
    .withMessage('Cliente no autorizado'),
  
  body('client_secret')
    .equals('123456')
    .withMessage('Cliente no autorizado'),
  
  handleValidationErrors
];

// 📱 Validaciones para Google login
const validateGoogleLogin = [
  body('token')
    .notEmpty()
    .withMessage('Token de Google requerido')
    .isLength({ min: 10 })
    .withMessage('Token de Google inválido'),
  
  handleValidationErrors
];

// 🔄 Validaciones para refresh token
const validateRefreshToken = [
  body('refresh_token')
    .notEmpty()
    .withMessage('Refresh token requerido')
    .isJWT()
    .withMessage('Refresh token inválido'),
  
  handleValidationErrors
];

// 📊 Validaciones para crear pregunta (admin)
const validateCreatePregunta = [
  body('texto')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Texto de pregunta debe tener entre 10 y 1000 caracteres')
    .trim(),
  
  handleValidationErrors
];

// 🧠 Validaciones para crear habilidad (admin)
const validateCreateHabilidad = [
  body('habilidad')
    .isLength({ min: 2, max: 255 })
    .withMessage('Nombre de habilidad debe tener entre 2 y 255 caracteres')
    .trim(),
  
  body('tipoId')
    .isInt({ min: 1 })
    .withMessage('Tipo de habilidad debe ser un ID válido'),
  
  handleValidationErrors
];

// ⚡ Middleware de sanitización general
const sanitizeInput = (req, res, next) => {
  // Sanitizar body
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        // Eliminar scripts y tags HTML peligrosos
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .trim();
      }
    }
  }
  
  next();
};

// 🚫 Middleware de rate limiting básico
const rateLimitMap = new Map();

const simpleRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const clientId = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!rateLimitMap.has(clientId)) {
      rateLimitMap.set(clientId, []);
    }
    
    const requests = rateLimitMap.get(clientId);
    
    // Eliminar requests fuera de la ventana
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Demasiadas solicitudes. Intenta más tarde.',
        retry_after: Math.ceil(windowMs / 1000)
      });
    }
    
    validRequests.push(now);
    rateLimitMap.set(clientId, validRequests);
    
    next();
  };
};

// 🧹 Limpiar rate limit map periódicamente
setInterval(() => {
  const now = Date.now();
  const cleanupTime = 60 * 60 * 1000; // 1 hora
  
  for (let [clientId, requests] of rateLimitMap.entries()) {
    const validRequests = requests.filter(time => (now - time) < cleanupTime);
    if (validRequests.length === 0) {
      rateLimitMap.delete(clientId);
    } else {
      rateLimitMap.set(clientId, validRequests);
    }
  }
}, 10 * 60 * 1000); // Cada 10 minutos

module.exports = {
  // Manejadores
  handleValidationErrors,
  sanitizeInput,
  simpleRateLimit,
  
  // Validaciones específicas
  validateEntrevistaRequest,
  validateEmailRequest,
  validateSearchQuery,
  validatePaginationQuery,
  validateIdParam,
  validateCVProcessing,
  validateFinalizarEntrevista,
  
  // Validaciones de auth
  validateUserRegistration,
  validateUserLogin,
  validateGoogleLogin,
  validateRefreshToken,
  
  // Validaciones de admin
  validateCreatePregunta,
  validateCreateHabilidad
};