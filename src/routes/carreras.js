const express = require("express");
const router = express.Router();
const { Carrera } = require("../models");
const authMiddleware = require("../middlewares/authMiddleware");

// 🔒 Todas las rutas requieren autenticación
router.use(authMiddleware);

// 📋 Obtener todas las carreras
router.get("/", async (req, res) => {
  try {
    const { area } = req.query;
    
    const where = {};
    if (area) where.area = area;

    const carreras = await Carrera.findAll({
      where,
      order: [['nombre', 'ASC']]
    });

    res.json({ 
      carreras,
      total: carreras.length
    });
  } catch (error) {
    console.error('Error obteniendo carreras:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🔍 Obtener carrera específica por ID
router.get("/:carreraId", async (req, res) => {
  try {
    const { carreraId } = req.params;

    const carrera = await Carrera.findByPk(carreraId);

    if (!carrera) {
      return res.status(404).json({ error: "Carrera no encontrada" });
    }

    res.json({ carrera });
  } catch (error) {
    console.error('Error obteniendo carrera:', error);
    res.status(500).json({ error: error.message });
  }
});

// 📊 Obtener áreas disponibles
router.get("/metadata/areas", async (req, res) => {
  try {
    const carreras = await Carrera.findAll({
      attributes: ['area'],
      group: ['area']
    });

    const areas = [...new Set(carreras.map(c => c.area))];

    res.json({ 
      areas,
      total: areas.length
    });
  } catch (error) {
    console.error('Error obteniendo áreas:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;