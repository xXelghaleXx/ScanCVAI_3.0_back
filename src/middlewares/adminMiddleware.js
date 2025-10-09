const logger = require("../services/LoggerService");
const Alumno = require("../models/Alumno");

/**
 * Middleware para verificar que el usuario autenticado sea administrador
 * Debe usarse después del authMiddleware
 */
const adminMiddleware = async (req, res, next) => {
  try {
    // Verificar que el usuario esté autenticado (debería venir del authMiddleware)
    if (!req.user || !req.user.id) {
      logger.warn("Intento de acceso a ruta de admin sin autenticación", {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        error: "Autenticación requerida",
        message: "Debe estar autenticado para acceder a esta ruta"
      });
    }

    // Obtener el alumno de la base de datos para verificar su rol
    const alumno = await Alumno.findByPk(req.user.id, {
      attributes: ['id', 'correo', 'rol', 'estado']
    });

    if (!alumno) {
      logger.warn("Usuario no encontrado en verificación de admin", {
        user_id: req.user.id,
        ip: req.ip
      });
      return res.status(404).json({
        error: "Usuario no encontrado",
        message: "El usuario no existe en el sistema"
      });
    }

    // Verificar que el usuario esté activo
    if (alumno.estado !== 'activo') {
      logger.warn("Intento de acceso admin con cuenta inactiva", {
        user_id: alumno.id,
        estado: alumno.estado,
        ip: req.ip
      });
      return res.status(403).json({
        error: "Cuenta inactiva",
        message: "Su cuenta no está activa"
      });
    }

    // Verificar que el usuario sea administrador
    if (alumno.rol !== 'administrador') {
      logger.warn("Intento de acceso no autorizado a ruta de admin", {
        user_id: alumno.id,
        correo: alumno.correo,
        rol: alumno.rol,
        path: req.path,
        ip: req.ip
      });
      return res.status(403).json({
        error: "Acceso denegado",
        message: "No tiene permisos de administrador para acceder a este recurso"
      });
    }

    // Usuario es administrador - permitir acceso
    logger.debug("Acceso de administrador autorizado", {
      user_id: alumno.id,
      correo: alumno.correo,
      path: req.path,
      method: req.method
    });

    // Agregar información del rol al request para uso posterior
    req.user.rol = alumno.rol;

    next();
  } catch (error) {
    logger.error("Error en verificación de administrador", error, {
      user_id: req.user?.id,
      ip: req.ip,
      path: req.path
    });
    return res.status(500).json({
      error: "Error de autorización",
      message: "Error verificando permisos de administrador"
    });
  }
};

module.exports = adminMiddleware;
