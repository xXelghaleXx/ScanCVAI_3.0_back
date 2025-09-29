const jwt = require("jsonwebtoken");
const logger = require("../services/LoggerService");
const Token = require("../models/Token");

const authMiddleware = async (req, res, next) => {
  try {
    // 1. Verificar existencia del header de autorización
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      logger.warn("Intento de acceso sin token de autorización", {
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      return res.status(401).json({ 
        error: "Token requerido",
        message: "Debe proporcionar un token de autorización válido"
      });
    }

    // 2. Extraer y validar formato del token
    const [bearer, token] = authHeader.split(" ");
    if (bearer !== "Bearer" || !token) {
      logger.warn("Formato de token inválido", {
        ip: req.ip,
        path: req.path,
        method: req.method,
        auth_header: authHeader
      });
      return res.status(401).json({ 
        error: "Formato de token inválido",
        message: "El token debe ser proporcionado en formato 'Bearer <token>'"
      });
    }

    // 3. Verificar el token
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          if (err.name === 'TokenExpiredError') {
            reject(new Error('Token expirado'));
          } else {
            reject(new Error('Token inválido'));
          }
        }
        resolve(decoded);
      });
    });

    // 4. Verificar si el token está en la lista negra
    const tokenInBlacklist = await Token.findOne({
      where: { 
        refreshToken: token,
        isRevoked: true
      }
    });

    if (tokenInBlacklist) {
      logger.warn("Intento de uso de token revocado", {
        user_id: decoded.id,
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({ 
        error: "Token revocado",
        message: "El token ha sido revocado. Por favor, inicie sesión nuevamente."
      });
    }

    // 5. Todo OK - Agregar info del usuario al request
    req.user = decoded;
    
    // 6. Log de acceso exitoso
    logger.debug("Acceso autenticado exitoso", {
      user_id: decoded.id,
      path: req.path,
      method: req.method
    });

    next();
  } catch (error) {
    // 7. Manejar diferentes tipos de error
    logger.warn("Error de autenticación", {
      error: error.message,
      ip: req.ip,
      path: req.path,
      method: req.method
    });

    if (error.message === 'Token expirado') {
      return res.status(401).json({
        error: "Token expirado",
        message: "Su sesión ha expirado. Por favor, inicie sesión nuevamente.",
        code: "TOKEN_EXPIRED"
      });
    }

    return res.status(403).json({
      error: "Error de autenticación",
      message: error.message,
      code: "AUTH_ERROR"
    });
  }
};

module.exports = authMiddleware;
