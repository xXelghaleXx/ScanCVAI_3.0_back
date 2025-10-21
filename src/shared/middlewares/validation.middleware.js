const { body, param, query, validationResult } = require('express-validator');
const logger = require("../services/logger.service");
const utilsService = require("../services/utils.service");

// � Sanitizar datos sensibles antes de logear
const sanitizeRequestBody = (body) => {
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

// �📝 Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Generar ID único para el error
    const errorId = utilsService.generateUniqueId();
    
    // Formatear errores para el log
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value,
      location: err.location,
      type: err.type
    }));

    // Log detallado del error
    logger.warn('Errores de validación detectados', {
      error_id: errorId,
      endpoint: req.originalUrl,
      method: req.method,
      user_id: req.user?.id || 'anonymous',
      client_ip: req.ip,
      user_agent: req.headers['user-agent'],
      errors: formattedErrors,
      body: sanitizeRequestBody(req.body),
      query: req.query
    });

    // Agrupar errores por campo para una respuesta más clara
    const groupedErrors = formattedErrors.reduce((acc, err) => {
      if (!acc[err.field]) {
        acc[err.field] = [];
      }
      acc[err.field].push(err.message);
      return acc;
    }, {});

    // Enviar respuesta estructurada
    return res.status(400).json({
      error: 'Errores de validación',
      code: 'VALIDATION_ERROR',
      error_id: errorId,
      validation_errors: groupedErrors,
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// 🛡️ Validaciones comunes reutilizables
const commonValidations = {
  // Validación de ID
  id: param('id')
    .trim()
    .notEmpty().withMessage('El ID es requerido')
    .isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
  
  // Validación de email
  email: body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  
  // Validación de contraseña
  password: body('password')
    .trim()
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  
  // Validación de fecha
  date: (field) => body(field)
    .trim()
    .notEmpty().withMessage('La fecha es requerida')
    .isISO8601().withMessage('Formato de fecha inválido'),
  
  // Validación de texto
  text: (field, { required = true, min = 1, max = undefined } = {}) => {
    let validation = body(field).trim();
    
    if (required) {
      validation = validation.notEmpty().withMessage(`El campo ${field} es requerido`);
    }
    
    if (min !== undefined) {
      validation = validation.isLength({ min }).withMessage(`El campo ${field} debe tener al menos ${min} caracteres`);
    }
    
    if (max !== undefined) {
      validation = validation.isLength({ max }).withMessage(`El campo ${field} no puede tener más de ${max} caracteres`);
    }
    
    return validation;
  },
  
  // Validación de array
  array: (field, { required = true, min = undefined, max = undefined } = {}) => {
    let validation = body(field).isArray().withMessage(`El campo ${field} debe ser un array`);
    
    if (required) {
      validation = validation.notEmpty().withMessage(`El campo ${field} no puede estar vacío`);
    }
    
    if (min !== undefined) {
      validation = validation.isLength({ min }).withMessage(`El campo ${field} debe tener al menos ${min} elementos`);
    }
    
    if (max !== undefined) {
      validation = validation.isLength({ max }).withMessage(`El campo ${field} no puede tener más de ${max} elementos`);
    }
    
    return validation;
  }
};

// 🔍 Validaciones específicas por ruta
const validations = {
  auth: {
    login: [
      commonValidations.email,
      commonValidations.password
    ],
    register: [
      commonValidations.email,
      commonValidations.password,
      commonValidations.text('nombre', { min: 2, max: 50 }),
      commonValidations.text('apellido', { min: 2, max: 50 })
    ],
    changePassword: [
      commonValidations.password,
      body('newPassword')
        .trim()
        .notEmpty().withMessage('La nueva contraseña es requerida')
        .isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/)
        .withMessage('La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número')
        .custom((value, { req }) => {
          if (value === req.body.password) {
            throw new Error('La nueva contraseña debe ser diferente a la actual');
          }
          return true;
        })
    ]
  }
};

module.exports = {
  handleValidationErrors,
  commonValidations,
  validations
};

// 🆔 Validaciones para IDs en parámetros
const validateIdParam = (paramName = 'id') => [
  param(paramName)
    .isInt({ min: 1 })
    .withMessage(`${paramName} debe ser un número entero positivo`),
  
  handleValidationErrors
];

// 📄 Validaciones para procesar CV
const validateCVProcessing = [
  param('cvId')
    .isInt({ min: 1 })
    .withMessage('ID de CV debe ser un número entero positivo'),
  
  handleValidationErrors
];

// 🔐 Validaciones para login
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
  validateIdParam,
  validateCVProcessing,
  
  // Validaciones de auth
  validateUserRegistration,
  validateUserLogin
};