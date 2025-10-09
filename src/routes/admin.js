const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const AdminController = require("../controllers/AdminController");

// Todas las rutas de admin requieren autenticación + permisos de administrador
router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * @route   GET /api/admin/usuarios
 * @desc    Obtener lista de todos los usuarios con métricas básicas
 * @access  Admin
 * @query   page, limit, search, rol, estado
 */
router.get("/usuarios", AdminController.obtenerUsuarios);

/**
 * @route   GET /api/admin/usuarios/:userId
 * @desc    Obtener métricas detalladas de un usuario específico
 * @access  Admin
 */
router.get("/usuarios/:userId", AdminController.obtenerMetricasUsuario);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Obtener dashboard con estadísticas generales de todos los usuarios
 * @access  Admin
 */
router.get("/dashboard", AdminController.obtenerDashboardGeneral);

/**
 * @route   PUT /api/admin/usuarios/:userId/rol
 * @desc    Actualizar rol de un usuario
 * @access  Admin
 * @body    { rol: 'alumno' | 'administrador' }
 */
router.put("/usuarios/:userId/rol", AdminController.actualizarRolUsuario);

/**
 * @route   PUT /api/admin/usuarios/:userId/estado
 * @desc    Actualizar estado de un usuario
 * @access  Admin
 * @body    { estado: 'activo' | 'inactivo' | 'suspendido' }
 */
router.put("/usuarios/:userId/estado", AdminController.actualizarEstadoUsuario);

module.exports = router;
