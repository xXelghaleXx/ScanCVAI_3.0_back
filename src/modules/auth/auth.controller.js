const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Alumno } = require("../../database/models");
const { Token } = require("../../database/models");
const { Op } = require('sequelize');
const utilsService = require("../../shared/services/utils.service");
const logger = require("../../shared/services/logger.service");
const emailService = require("../../shared/services/email.service");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Función para crear access y refresh tokens
const generarTokens = async (alumnoId, correo, req) => {
  const alumno = await Alumno.findByPk(alumnoId, {
    attributes: ['rol']
  });

  const accessToken = jwt.sign(
    {
      id: alumnoId,
      correo,
      rol: alumno?.rol || 'alumno',
      type: 'access'
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "90m",
      jwtid: utilsService.generateUniqueId()
    }
  );

  const refreshToken = jwt.sign(
    { 
      id: alumnoId,
      type: 'refresh'
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: "30d",
      jwtid: utilsService.generateUniqueId()
    }
  );

  const deviceInfo = {
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    platform: req.headers['sec-ch-ua-platform'],
    mobile: req.headers['sec-ch-ua-mobile']
  };

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await Token.create({ 
    alumnoId, 
    refreshToken,
    expiresAt,
    deviceInfo,
    createdByIp: req.ip,
    lastUsedAt: new Date()
  });

  await limpiarTokensAntiguos(alumnoId);

  return { 
    accessToken, 
    refreshToken,
    expiresAt
  };
};

// Función para limpiar tokens antiguos o revocados
const limpiarTokensAntiguos = async (alumnoId) => {
  const ahora = new Date();
  
  try {
    await Token.destroy({
      where: {
        alumnoId,
        [Op.or]: [
          { expiresAt: { [Op.lt]: ahora } },
          { isRevoked: true }
        ]
      }
    });

    const tokensActivos = await Token.findAll({
      where: {
        alumnoId,
        expiresAt: { [Op.gt]: ahora },
        isRevoked: false
      },
      order: [['createdAt', 'DESC']]
    });

    if (tokensActivos.length > 5) {
      const tokensPorRevocar = tokensActivos.slice(5);
      for (const token of tokensPorRevocar) {
        token.isRevoked = true;
        await token.save();
      }
    }
  } catch (error) {
    logger.error('Error limpiando tokens antiguos', error, { alumnoId });
  }
};

// ========== EXPORTS ==========

exports.register = async (req, res) => {
  try {
    const { nombre, correo, contrasena, rol } = req.body;

    const existe = await Alumno.findOne({ where: { correo } });
    if (existe) return res.status(400).json({ error: "Correo ya registrado" });

    // Validar rol si se proporciona (acepta 'admin' como alias de 'administrador')
    let rolValido = 'alumno';
    if (rol) {
      if (rol === 'administrador' || rol === 'admin') {
        rolValido = 'administrador';
      } else if (rol === 'alumno') {
        rolValido = 'alumno';
      }
    }

    const alumno = await Alumno.create({
      nombre,
      correo,
      contrasena,
      rol: rolValido,
      estado: 'activo',
      intentos_fallidos: 0
    });

    res.json({
      message: "Usuario registrado con éxito",
      alumno: {
        id: alumno.id,
        nombre: alumno.nombre,
        correo: alumno.correo,
        rol: alumno.rol
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { correo, contrasena, client_id, client_secret } = req.body;

    if (!client_id || !client_secret) {
      return res.status(401).json({ 
        error: "Credenciales de cliente requeridas",
        code: "MISSING_CLIENT_CREDENTIALS"
      });
    }

    if (client_id !== process.env.CLIENT_ID || client_secret !== process.env.CLIENT_SECRET) {
      logger.warn('Intento de acceso con credenciales de cliente inválidas', {
        provided_client_id: client_id,
        ip: req.ip
      });
      return res.status(401).json({ 
        error: "Cliente no autorizado",
        code: "INVALID_CLIENT"
      });
    }

    const alumno = await Alumno.findOne({ 
      where: { correo },
      attributes: ['id', 'correo', 'contrasena', 'nombre', 'fecha_ultimo_acceso']
    });

    if (!alumno) {
      logger.warn('Intento de acceso con correo no registrado', {
        correo,
        ip: req.ip
      });
      return res.status(404).json({ 
        error: "Usuario no encontrado",
        code: "USER_NOT_FOUND"
      });
    }

    const valido = await alumno.checkPassword(contrasena);
    if (!valido) {
      alumno.intentos_fallidos = (alumno.intentos_fallidos || 0) + 1;
      alumno.fecha_ultimo_acceso = new Date();
      await alumno.save();

      logger.warn('Intento de acceso fallido', {
        correo,
        intentos_fallidos: alumno.intentos_fallidos,
        ip: req.ip
      });

      return res.status(401).json({ 
        error: "Credenciales inválidas",
        code: "INVALID_CREDENTIALS",
        attempts_remaining: 5 - alumno.intentos_fallidos
      });
    }

    alumno.intentos_fallidos = 0;
    alumno.fecha_ultimo_acceso = new Date();
    await alumno.save();

    const { accessToken, refreshToken, expiresAt } = await generarTokens(alumno.id, alumno.correo, req);

    logger.info('Login exitoso', {
      alumno_id: alumno.id,
      correo: alumno.correo,
      ip: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 900,
      refresh_expires_at: expiresAt,
      user: {
        id: alumno.id,
        nombre: alumno.nombre,
        correo: alumno.correo,
        ultimo_acceso: alumno.fecha_ultimo_acceso
      }
    });

  } catch (error) {
    logger.error('Error en login', error, {
      correo: req.body?.correo,
      ip: req.ip
    });
    res.status(500).json({ 
      error: "Error de autenticación",
      code: "AUTH_ERROR"
    });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ 
        error: "Credential de Google requerido",
        code: "MISSING_GOOGLE_CREDENTIAL"
      });
    }

    logger.info('Intento de login con Google', {
      ip: req.ip,
      user_agent: req.headers['user-agent']
    });

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, email_verified } = payload;

    logger.info('Token de Google verificado', {
      email,
      email_verified
    });

    if (!email_verified) {
      return res.status(400).json({
        error: "El email de Google no está verificado",
        code: "EMAIL_NOT_VERIFIED"
      });
    }

    // VALIDACIÓN DE DOMINIO TECSUP
    if (!email || !email.toLowerCase().endsWith('@tecsup.edu.pe')) {
      logger.warn('Intento de acceso con dominio no autorizado', {
        email,
        ip: req.ip
      });
      return res.status(403).json({
        error: "Solo se permite el acceso con correos institucionales @tecsup.edu.pe",
        code: "UNAUTHORIZED_DOMAIN"
      });
    }

    logger.info('Dominio Tecsup verificado', { email });

    let alumno = await Alumno.findOne({ where: { correo: email } });

    if (!alumno) {
      // Extraer nombre del email: primer nombre antes del punto o antes del @
      let nombreExtraido = name;
      if (!nombreExtraido) {
        const emailPart = email.split('@')[0];
        // Si hay punto, tomar solo el primer nombre
        const nombreParts = emailPart.split('.');
        nombreExtraido = nombreParts[0];
        // Capitalizar primera letra
        nombreExtraido = nombreExtraido.charAt(0).toUpperCase() + nombreExtraido.slice(1).toLowerCase();
      }

      alumno = await Alumno.create({
        nombre: nombreExtraido,
        correo: email,
        contrasena: Math.random().toString(36).slice(-8),
        estado: 'activo',
        intentos_fallidos: 0
      });

      logger.userRegistered(alumno.id, email, 'google');
    }

    alumno.fecha_ultimo_acceso = new Date();
    await alumno.save();

    const { accessToken, refreshToken, expiresAt } = await generarTokens(
      alumno.id, 
      alumno.correo, 
      req
    );

    logger.userLogin(alumno.id, email, 'google');

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 900,
      refresh_expires_at: expiresAt,
      user: {
        id: alumno.id,
        nombre: alumno.nombre,
        correo: alumno.correo,
        picture: picture,
        ultimo_acceso: alumno.fecha_ultimo_acceso,
        login_method: 'google'
      }
    });

  } catch (error) {
    if (error.message.includes('Invalid token') || error.message.includes('Token used too late')) {
      logger.warn('Token de Google inválido', {
        error: error.message,
        ip: req.ip
      });
      return res.status(401).json({
        error: "Token de Google inválido o expirado",
        code: "INVALID_GOOGLE_TOKEN"
      });
    }

    logger.error('Error en login con Google', error, {
      ip: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.status(500).json({ 
      error: "Error en autenticación con Google",
      code: "GOOGLE_AUTH_ERROR",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ 
        error: "Refresh token requerido",
        code: "MISSING_TOKEN"
      });
    }

    const token = await Token.findOne({ 
      where: { refreshToken: refresh_token } 
    });

    if (!token) {
      return res.status(404).json({ 
        error: "Token no encontrado",
        code: "TOKEN_NOT_FOUND"
      });
    }

    token.isRevoked = true;
    token.lastUsedAt = new Date();
    await token.save();

    logger.info('Sesión cerrada exitosamente', {
      alumnoId: token.alumnoId,
      deviceInfo: token.deviceInfo,
      tokenAge: Date.now() - token.createdAt
    });

    res.json({ 
      message: "Logout exitoso. Token invalidado.",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error en logout', error, { 
      token: req.body.refresh_token 
    });
    res.status(500).json({ 
      error: "Error cerrando sesión",
      code: "LOGOUT_ERROR"
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ 
        error: "Refresh token requerido",
        code: "MISSING_TOKEN"
      });
    }

    const tokenDB = await Token.findOne({ 
      where: { refreshToken: refresh_token },
      include: [{ 
        model: Alumno,
        attributes: ['id', 'correo', 'estado']
      }]
    });

    if (!tokenDB) {
      return res.status(403).json({ 
        error: "Refresh token inválido",
        code: "INVALID_TOKEN"
      });
    }

    if (tokenDB.isRevoked) {
      return res.status(403).json({ 
        error: "Token revocado",
        code: "REVOKED_TOKEN"
      });
    }

    if (new Date() > tokenDB.expiresAt) {
      return res.status(403).json({ 
        error: "Token expirado",
        code: "EXPIRED_TOKEN"
      });
    }

    if (tokenDB.Alumno.estado !== 'activo') {
      return res.status(403).json({ 
        error: "Cuenta de usuario inactiva",
        code: "INACTIVE_ACCOUNT"
      });
    }

    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(refresh_token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) reject(err);
        resolve(decoded);
      });
    });

    const newAccessToken = jwt.sign(
      { 
        id: decoded.id,
        correo: tokenDB.Alumno.correo,
        type: 'access'
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: "15m",
        jwtid: utilsService.generateUniqueId()
      }
    );

    tokenDB.lastUsedAt = new Date();
    await tokenDB.save();

    logger.info('Token renovado exitosamente', {
      alumnoId: tokenDB.alumnoId,
      deviceInfo: tokenDB.deviceInfo,
      lastUsed: tokenDB.lastUsedAt
    });

    return res.json({
      access_token: newAccessToken,
      token_type: "Bearer",
      expires_in: 900,
      refresh_token_status: {
        expires_at: tokenDB.expiresAt,
        last_used: tokenDB.lastUsedAt
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        error: "Token malformado",
        code: "MALFORMED_TOKEN"
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        error: "Token expirado",
        code: "EXPIRED_TOKEN"
      });
    }

    logger.error('Error en refresh token', error, {
      token_provided: !!req.body.refresh_token
    });

    res.status(500).json({ 
      error: "Error renovando token",
      code: "REFRESH_ERROR"
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const alumnoId = req.user.id;

    const alumno = await Alumno.findByPk(alumnoId, {
      attributes: ['id', 'nombre', 'correo', 'fecha_ultimo_acceso', 'estado', 'createdAt']
    });

    if (!alumno) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      success: true,
      profile: {
        id: alumno.id,
        nombre: alumno.nombre,
        correo: alumno.correo,
        fecha_ultimo_acceso: alumno.fecha_ultimo_acceso,
        fecha_registro: alumno.createdAt,
        estado: alumno.estado
      }
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error obteniendo perfil' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const alumnoId = req.user.id;
    const { nombre } = req.body;

    if (!nombre || nombre.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
    }

    const alumno = await Alumno.findByPk(alumnoId);
    if (!alumno) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    alumno.nombre = nombre.trim();
    await alumno.save();

    res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      profile: {
        id: alumno.id,
        nombre: alumno.nombre,
        correo: alumno.correo
      }
    });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error actualizando perfil' });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const alumnoId = req.user.id;
    const { CV, Entrevista, Informe } = require("../../database/models");

    const [totalCVs, totalEntrevistas, totalInformes, cvsProcessed] = await Promise.all([
      CV.count({ where: { alumnoId } }),
      Entrevista.count({ where: { alumnoId } }),
      Informe.count({
        include: [{ model: CV, as: 'cv', where: { alumnoId } }]
      }),
      CV.count({
        where: { 
          alumnoId,
          contenido_extraido: { [Op.not]: null }
        }
      })
    ]);

    res.json({
      success: true,
      stats: {
        total_cvs: totalCVs,
        cvs_procesados: cvsProcessed,
        cvs_pendientes: totalCVs - cvsProcessed,
        total_entrevistas: totalEntrevistas,
        total_informes: totalInformes,
        progreso_analisis: totalCVs > 0 ? Math.round((cvsProcessed / totalCVs) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const alumnoId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Se requiere contraseña actual y nueva' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const alumno = await Alumno.findByPk(alumnoId);
    if (!alumno) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isValid = await alumno.checkPassword(current_password);
    if (!isValid) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    alumno.contrasena = new_password;
    await alumno.save();

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ error: 'Error cambiando contraseña' });
  }
};

/**
 * Solicitar recuperación de contraseña
 * Genera un token y envía email con enlace de recuperación
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { correo } = req.body;

    if (!correo) {
      return res.status(400).json({
        error: 'Se requiere el correo electrónico',
        code: 'MISSING_EMAIL'
      });
    }

    const alumno = await Alumno.findOne({ where: { correo } });

    // Por seguridad, siempre devolver success incluso si el correo no existe
    // para evitar que se pueda enumerar usuarios
    if (!alumno) {
      logger.warn('Intento de recuperación de contraseña con correo no registrado', {
        correo,
        ip: req.ip
      });
      return res.json({
        success: true,
        message: 'Si el correo existe, recibirás un enlace de recuperación'
      });
    }

    // Generar token único
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Token expira en 1 hora
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Guardar token hasheado en la base de datos
    alumno.reset_password_token = hashedToken;
    alumno.reset_password_expires = expiresAt;
    await alumno.save();

    // Enviar email con el token original (no hasheado)
    try {
      await emailService.enviarEmailRecuperacion(correo, resetToken);

      logger.info('Email de recuperación enviado', {
        alumno_id: alumno.id,
        correo,
        expires_at: expiresAt
      });

      res.json({
        success: true,
        message: 'Si el correo existe, recibirás un enlace de recuperación',
        expires_in: '1 hora'
      });

    } catch (emailError) {
      // Si falla el envío de email, limpiar el token
      alumno.reset_password_token = null;
      alumno.reset_password_expires = null;
      await alumno.save();

      logger.error('Error enviando email de recuperación', emailError, {
        alumno_id: alumno.id,
        correo
      });

      return res.status(500).json({
        error: 'Error al enviar el correo de recuperación. Intenta nuevamente.',
        code: 'EMAIL_SEND_ERROR'
      });
    }

  } catch (error) {
    logger.error('Error en forgot password', error, {
      correo: req.body?.correo,
      ip: req.ip
    });
    res.status(500).json({
      error: 'Error procesando la solicitud',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * Restablecer contraseña con token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, nueva_contrasena } = req.body;

    if (!token || !nueva_contrasena) {
      return res.status(400).json({
        error: 'Se requiere token y nueva contraseña',
        code: 'MISSING_FIELDS'
      });
    }

    if (nueva_contrasena.length < 6) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 6 caracteres',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // Hashear el token recibido para compararlo con la BD
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Buscar alumno con token válido y no expirado
    const alumno = await Alumno.findOne({
      where: {
        reset_password_token: hashedToken,
        reset_password_expires: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!alumno) {
      logger.warn('Intento de reset con token inválido o expirado', {
        ip: req.ip
      });
      return res.status(400).json({
        error: 'Token inválido o expirado. Solicita un nuevo enlace de recuperación.',
        code: 'INVALID_TOKEN'
      });
    }

    // Actualizar contraseña
    alumno.contrasena = nueva_contrasena;
    alumno.reset_password_token = null;
    alumno.reset_password_expires = null;
    alumno.intentos_fallidos = 0; // Resetear intentos fallidos
    await alumno.save();

    logger.info('Contraseña restablecida exitosamente', {
      alumno_id: alumno.id,
      correo: alumno.correo
    });

    // Enviar email de confirmación
    try {
      await emailService.enviarConfirmacionCambioPassword(alumno.correo, alumno.nombre);
    } catch (emailError) {
      // No fallar si el email de confirmación falla
      logger.error('Error enviando confirmación de cambio de contraseña', emailError);
    }

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.'
    });

  } catch (error) {
    logger.error('Error en reset password', error, {
      ip: req.ip
    });
    res.status(500).json({
      error: 'Error al restablecer la contraseña',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * Verificar validez de token de recuperación
 */
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        error: 'Se requiere el token',
        code: 'MISSING_TOKEN'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const alumno = await Alumno.findOne({
      where: {
        reset_password_token: hashedToken,
        reset_password_expires: {
          [Op.gt]: new Date()
        }
      },
      attributes: ['id', 'correo', 'nombre', 'reset_password_expires']
    });

    if (!alumno) {
      return res.status(400).json({
        valid: false,
        error: 'Token inválido o expirado',
        code: 'INVALID_TOKEN'
      });
    }

    res.json({
      valid: true,
      correo: alumno.correo,
      nombre: alumno.nombre,
      expires_at: alumno.reset_password_expires
    });

  } catch (error) {
    logger.error('Error verificando token', error);
    res.status(500).json({
      error: 'Error verificando el token',
      code: 'SERVER_ERROR'
    });
  }
};