const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Rutas básicas
router.post("/register", authController.register);
router.post("/login", authController.login);

// ✅ AGREGAR AMBAS RUTAS PARA GOOGLE
router.post("/google", authController.googleLogin);
router.post("/google/callback", authController.googleLogin); // ← Agregar esta

// Rutas de tokens
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);

module.exports = router;