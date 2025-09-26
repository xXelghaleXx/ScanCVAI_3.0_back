const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const Alumno = require("../models/Alumno");
const Token = require("../models/Token");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Función para crear access y refresh tokens
const generarTokens = async (alumnoId, correo) => {
  const accessToken = jwt.sign(
    { id: alumnoId, correo },
    process.env.JWT_SECRET,
    { expiresIn: "15m" } // access token corto
  );

  const refreshToken = jwt.sign(
    { id: alumnoId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" } // refresh token largo
  );

  // Guardamos en BD
  await Token.create({ alumnoId, refreshToken });

  return { accessToken, refreshToken };
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
    const { correo, contrasena, client_id, client_secret } = req.body;

    if (client_id !== "frontend_app" || client_secret !== "123456") {
      return res.status(401).json({ error: "Cliente no autorizado" });
    }

    const alumno = await Alumno.findOne({ where: { correo } });
    if (!alumno) return res.status(404).json({ error: "Usuario no encontrado" });

    const valido = await alumno.checkPassword(contrasena);
    if (!valido) return res.status(401).json({ error: "Credenciales inválidas" });

    alumno.fecha_ultimo_acceso = new Date();
    await alumno.save();

    const { accessToken, refreshToken } = await generarTokens(alumno.id, alumno.correo);

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 900, // 15 min
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//LoginGoogle

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) return res.status(400).json({ error: "Token de Google requerido" });

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    let alumno = await Alumno.findOne({ where: { correo: email } });

    if (!alumno) {
      alumno = await Alumno.create({
        nombre: name,
        correo: email,
        contrasena: Math.random().toString(36).slice(-8),
      });
    }

    alumno.fecha_ultimo_acceso = new Date();
    await alumno.save();

    const { accessToken, refreshToken } = await generarTokens(alumno.id, alumno.correo);

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 900,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// 🔹 Logout (elimina refresh token)
exports.logout = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: "Refresh token requerido" });

    await Token.destroy({ where: { refreshToken: refresh_token } });

    res.json({ message: "Logout exitoso. Token invalidado." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// 🔹 Refrescar access token
exports.refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: "Refresh token requerido" });

    const tokenDB = await Token.findOne({ where: { refreshToken: refresh_token } });
    if (!tokenDB) return res.status(403).json({ error: "Refresh token inválido" });

    jwt.verify(refresh_token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: "Refresh token expirado" });

      const newAccessToken = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      return res.json({
        access_token: newAccessToken,
        token_type: "Bearer",
        expires_in: 900,
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};