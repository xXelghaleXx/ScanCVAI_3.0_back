const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

// ========== RUTAS PÚBLICAS (sin autenticación) ==========

// 📝 Registro de usuario
router.post("/register", authController.register);

// 🔐 Login tradicional
router.post("/login", authController.login);

// 🌐 Login con Google (ambas rutas para compatibilidad)
router.post("/google", authController.googleLogin);
router.post("/google/callback", authController.googleLogin);

// 🔄 Refrescar access token (público, solo requiere refresh token)
router.post("/refresh", authController.refreshToken);

// ========== RUTAS PROTEGIDAS (requieren autenticación) ==========

// Aplicar middleware de autenticación a todas las rutas siguientes
router.use(authMiddleware);

// 🚪 Logout (requiere estar autenticado)
router.post("/logout", authController.logout);

// 👤 Obtener perfil del usuario autenticado
router.get("/profile", authController.getProfile);

// ✏️ Actualizar perfil del usuario
router.put("/profile", authController.updateProfile);

// 📊 Obtener estadísticas del usuario
router.get("/stats", authController.getUserStats);

// 🔐 Cambiar contraseña
router.post("/change-password", authController.changePassword);

module.exports = router;