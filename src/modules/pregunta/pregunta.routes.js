const express = require("express");
const router = express.Router();
const { PreguntaEntrevista } = require("../../database/models");
const authMiddleware = require("../../shared/middlewares/auth.middleware");

// 🔒 Todas las rutas requieren autenticación
router.use(authMiddleware);

// 📋 Obtener todas las preguntas
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: preguntas } = await PreguntaEntrevista.findAndCountAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      preguntas,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🎲 Obtener pregunta aleatoria
router.get("/aleatoria", async (req, res) => {
  try {
    const pregunta = await PreguntaEntrevista.findOne({
      order: require('sequelize').literal('random()')
    });

    if (!pregunta) {
      return res.status(404).json({ error: "No hay preguntas disponibles" });
    }

    res.json({ pregunta });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔍 Buscar preguntas por contenido
router.get("/buscar", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Parámetro de búsqueda 'q' requerido" });
    }

    const preguntas = await PreguntaEntrevista.findAll({
      where: {
        texto: {
          [require('sequelize').Op.iLike]: `%${q}%`
        }
      },
      order: [['createdAt', 'DESC']]
    });

    res.json({ preguntas, termino_busqueda: q });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📊 Estadísticas de preguntas
router.get("/estadisticas", async (req, res) => {
  try {
    const totalPreguntas = await PreguntaEntrevista.count();
    
    const preguntaMasReciente = await PreguntaEntrevista.findOne({
      order: [['createdAt', 'DESC']]
    });

    const preguntaMasAntigua = await PreguntaEntrevista.findOne({
      order: [['createdAt', 'ASC']]
    });

    res.json({
      estadisticas: {
        total_preguntas: totalPreguntas,
        pregunta_mas_reciente: preguntaMasReciente ? {
          id: preguntaMasReciente.id,
          fecha: preguntaMasReciente.createdAt
        } : null,
        pregunta_mas_antigua: preguntaMasAntigua ? {
          id: preguntaMasAntigua.id,
          fecha: preguntaMasAntigua.createdAt
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;