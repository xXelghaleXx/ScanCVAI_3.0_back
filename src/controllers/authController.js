const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const Alumno = require("../models/Alumno");
const Token = require("../models/Token");
const { Op } = require('sequelize');
const utilsService = require('../services/UtilsService');
const logger = require("../services/LoggerService");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Función para crear access y refresh tokens
const generarTokens = async (alumnoId, correo, req) => {
  // 1. Generar Access Token
  const accessToken = jwt.sign(
    { 
      id: alumnoId, 
      correo,
      type: 'access'
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: "15m",
      jwtid: utilsService.generateUniqueId() 
    }
  );

  // 2. Generar Refresh Token
  const refreshToken = jwt.sign(
    { 
      id: alumnoId,
      type: 'refresh'
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: "7d",
      jwtid: utilsService.generateUniqueId()
    }
  );

  // 3. Recopilar información del dispositivo
  const deviceInfo = {
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    platform: req.headers['sec-ch-ua-platform'],
    mobile: req.headers['sec-ch-ua-mobile']
  };

  // 4. Calcular fecha de expiración
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

  // 5. Guardar token en BD
  await Token.create({ 
    alumnoId, 
    refreshToken,
    expiresAt,
    deviceInfo,
    createdByIp: req.ip,
    lastUsedAt: new Date()
  });

  // 6. Limpiar tokens antiguos o revocados del mismo usuario
  await limpiarTokensAntiguos(alumnoId);

  return { 
    accessToken, 
    refreshToken,
    expiresAt
  };
};

//registrar

exports.register = async (req, res) => {
  try {
    const { nombre, correo, contrasena } = req.body;

    const existe = await Alumno.findOne({ where: { correo } });
    if (existe) return res.status(400).json({ error: "Correo ya registrado" });

    const alumno = await Alumno.create({ nombre, correo, contrasena });

    res.json({ message: "Alumno registrado con éxito", alumno });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//loginNormal
exports.login = async (req, res) => {
  try {
    // 1. Validar credenciales de cliente
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

    // 2. Validar credenciales de usuario
    const alumno = await Alumno.findOne({ 
      where: { correo },
      attributes: ['id', 'correo', 'contrasena', 'nombre', 'fecha_ultimo_acceso']
    });

    // 3. Manejo de usuario no encontrado
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
/*
    // 4. Verificar estado de la cuenta
    if (alumno.estado !== 'activo') {
      logger.warn('Intento de acceso a cuenta inactiva', {
        correo,
        estado: alumno.estado,
        ip: req.ip
      });
      return res.status(403).json({ 
        error: "Cuenta inactiva",
        code: "INACTIVE_ACCOUNT"
      });
    }
      
    // 5. Verificar bloqueo por intentos fallidos
    if (alumno.intentos_fallidos >= 5) {
      const ultimoIntento = new Date(alumno.fecha_ultimo_acceso);
      const tiempoEspera = 15 * 60 * 1000; // 15 minutos
      if ((Date.now() - ultimoIntento) < tiempoEspera) {
        return res.status(429).json({
          error: "Cuenta bloqueada temporalmente",
          code: "ACCOUNT_LOCKED",
          unlock_time: new Date(ultimoIntento.getTime() + tiempoEspera)
        });
      } else {
        // Resetear intentos después del tiempo de espera
        alumno.intentos_fallidos = 0;
      }
    }
*/
    // 6. Validar contraseña
    const valido = await alumno.checkPassword(contrasena);
    if (!valido) {
      // Incrementar contador de intentos fallidos
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

    // 7. Actualizar estado del alumno
    alumno.intentos_fallidos = 0;
    alumno.fecha_ultimo_acceso = new Date();
    await alumno.save();

    // 8. Generar tokens
    const { accessToken, refreshToken, expiresAt } = await generarTokens(alumno.id, alumno.correo, req);

    // 9. Log de acceso exitoso
    logger.info('Login exitoso', {
      alumno_id: alumno.id,
      correo: alumno.correo,
      ip: req.ip,
      user_agent: req.headers['user-agent']
    });

    // 10. Respuesta exitosa
    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 900, // 15 min
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

//LoginGoogle

exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;  // ← Cambiar de 'token' a 'credential'

    // Validar que se envió el credential
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

    // Verificar el token con Google
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, email_verified, sub: googleId } = payload;

    logger.info('Token de Google verificado', {
      email,
      email_verified
    });

    // Validar que el email esté verificado
    if (!email_verified) {
      return res.status(400).json({
        error: "El email de Google no está verificado",
        code: "EMAIL_NOT_VERIFIED"
      });
    }

    // Buscar o crear usuario
    let alumno = await Alumno.findOne({ where: { correo: email } });

    if (!alumno) {
      // Crear nuevo usuario con datos de Google
      alumno = await Alumno.create({
        nombre: name || email.split('@')[0],
        correo: email,
        contrasena: Math.random().toString(36).slice(-8), // Contraseña aleatoria
        estado: 'activo',
        intentos_fallidos: 0
      });

      logger.userRegistered(alumno.id, email, 'google');
    }

    // Actualizar último acceso
    alumno.fecha_ultimo_acceso = new Date();
    await alumno.save();

    // Generar tokens
    const { accessToken, refreshToken, expiresAt } = await generarTokens(
      alumno.id, 
      alumno.correo, 
      req
    );

    // Log de acceso exitoso
    logger.userLogin(alumno.id, email, 'google');

    // Respuesta exitosa
    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 900, // 15 minutos
      refresh_expires_at: expiresAt,
      user: {
        id: alumno.id,
        nombre: alumno.nombre,
        correo: alumno.correo,
        picture: picture, // Incluir foto de perfil de Google
        ultimo_acceso: alumno.fecha_ultimo_acceso,
        login_method: 'google'
      }
    });

  } catch (error) {
    // Manejo de errores específicos de Google
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

    // Error general
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

// Función para limpiar tokens antiguos o revocados
const limpiarTokensAntiguos = async (alumnoId) => {
  const ahora = new Date();
  
  try {
    // Eliminar tokens expirados o revocados
    await Token.destroy({
      where: {
        alumnoId,
        [Op.or]: [
          { expiresAt: { [Op.lt]: ahora } },
          { isRevoked: true }
        ]
      }
    });

    // Mantener solo los últimos 5 tokens activos por usuario
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

// 🔹 Logout (invalida refresh token)
exports.logout = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ 
        error: "Refresh token requerido",
        code: "MISSING_TOKEN"
      });
    }

    // Buscar y marcar token como revocado
    const token = await Token.findOne({ 
      where: { refreshToken: refresh_token } 
    });

    if (!token) {
      return res.status(404).json({ 
        error: "Token no encontrado",
        code: "TOKEN_NOT_FOUND"
      });
    }

    // Actualizar token
    token.isRevoked = true;
    token.lastUsedAt = new Date();
    await token.save();

    // Log de cierre de sesión
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
// 🔹 Refrescar access token
exports.refreshToken = async (req, res) => {
  try {
    // 1. Validar existencia del token
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ 
        error: "Refresh token requerido",
        code: "MISSING_TOKEN"
      });
    }

    // 2. Buscar token en la base de datos
    const tokenDB = await Token.findOne({ 
      where: { refreshToken: refresh_token },
      include: [{ 
        model: Alumno,
        attributes: ['id', 'correo', 'estado']
      }]
    });

    // 3. Validar existencia y estado del token
    if (!tokenDB) {
      return res.status(403).json({ 
        error: "Refresh token inválido",
        code: "INVALID_TOKEN"
      });
    }

    // 4. Verificar si el token está revocado
    if (tokenDB.isRevoked) {
      return res.status(403).json({ 
        error: "Token revocado",
        code: "REVOKED_TOKEN"
      });
    }

    // 5. Verificar expiración
    if (new Date() > tokenDB.expiresAt) {
      return res.status(403).json({ 
        error: "Token expirado",
        code: "EXPIRED_TOKEN"
      });
    }

    // 6. Verificar estado del alumno
    if (tokenDB.Alumno.estado !== 'activo') {
      return res.status(403).json({ 
        error: "Cuenta de usuario inactiva",
        code: "INACTIVE_ACCOUNT"
      });
    }

    // 7. Verificar firma del token
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(refresh_token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) reject(err);
        resolve(decoded);
      });
    });

    // 8. Generar nuevo access token
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

    // 9. Actualizar último uso del refresh token
    tokenDB.lastUsedAt = new Date();
    await tokenDB.save();

    // 10. Log de renovación exitosa
    logger.info('Token renovado exitosamente', {
      alumnoId: tokenDB.alumnoId,
      deviceInfo: tokenDB.deviceInfo,
      lastUsed: tokenDB.lastUsedAt
    });

    // 11. Enviar respuesta
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
    // 12. Manejo de errores específicos
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

    // Log del error
    logger.error('Error en refresh token', error, {
      token_provided: !!refresh_token
    });

    // Respuesta genérica de error
    res.status(500).json({ 
      error: "Error renovando token",
      code: "REFRESH_ERROR"
    });
  }
};