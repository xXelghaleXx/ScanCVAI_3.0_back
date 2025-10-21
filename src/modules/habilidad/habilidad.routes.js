const express = require("express");
const router = express.Router();
const { TipoHabilidad, Habilidad } = require("../../database/models");
const authMiddleware = require("../../shared/middlewares/auth.middleware");

// 🔒 Todas las rutas requieren autenticación
router.use(authMiddleware);

// 📋 Obtener todos los tipos de habilidades
router.get("/tipos", async (req, res) => {
  try {
    const tipos = await TipoHabilidad.findAll({
      include: [
        {
          model: Habilidad,
          as: 'habilidades'
        }
      ]
    });

    res.json({ tipos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📋 Obtener habilidades por tipo
router.get("/tipo/:tipoId", async (req, res) => {
  try {
    const { tipoId } = req.params;

    const habilidades = await Habilidad.findAll({
      where: { tipoId },
      include: [
        {
          model: TipoHabilidad,
          as: 'tipo'
        }
      ]
    });

    res.json({ habilidades });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔍 Buscar habilidades por término
router.get("/buscar", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Parámetro de búsqueda 'q' requerido" });
    }

    const habilidades = await Habilidad.findAll({
      where: {
        habilidad: {
          [require('sequelize').Op.iLike]: `%${q}%`
        }
      },
      include: [
        {
          model: TipoHabilidad,
          as: 'tipo'
        }
      ]
    });

    res.json({ habilidades, termino_busqueda: q });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📊 Estadísticas de habilidades más comunes
router.get("/estadisticas", async (req, res) => {
  try {
    const totalTipos = await TipoHabilidad.count();
    const totalHabilidades = await Habilidad.count();

    // Habilidades por tipo
    const habilidadesPorTipo = await TipoHabilidad.findAll({
      attributes: [
        'nombre',
        [require('sequelize').fn('COUNT', require('sequelize').col('habilidades.id')), 'total']
      ],
      include: [
        {
          model: Habilidad,
          as: 'habilidades',
          attributes: []
        }
      ],
      group: ['TipoHabilidad.id', 'TipoHabilidad.nombre']
    });

    res.json({
      estadisticas: {
        total_tipos: totalTipos,
        total_habilidades: totalHabilidades,
        habilidades_por_tipo: habilidadesPorTipo
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;