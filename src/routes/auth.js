const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/google", authController.googleLogin);

router.post("/refresh", authController.refreshToken); // 🔹 nuevo
router.post("/logout", authController.logout);       // 🔹 nuevo

module.exports = router;
