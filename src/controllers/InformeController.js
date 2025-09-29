const { 
  Informe, 
  CV, 
  Alumno, 
  InformeFortalezas, 
  InformeHabilidades, 
  InformeAreasMejora,
  Habilidad,
  TipoHabilidad
} = require("../models");

class InformeController {

  // 📊 RF-107: Obtener informe detallado
  static async obtenerInforme(req, res) {
    try {
      const { informeId } = req.params;
      const alumnoId = req.user.id;

      const informe = await Informe.findOne({
        where: { id: informeId },
        include: [
          {
            model: CV,
            as: 'cv',
            where: { alumnoId }, // Verificar que pertenece al alumno
            include: [
              {
                model: Alumno,
                as: 'alumno'
              }
            ]
          },
          {
            model: InformeFortalezas,
            as: 'fortalezas'
          },
          {
            model: InformeHabilidades,
            as: 'habilidades',
            include: [
              {
                model: Habilidad,
                as: 'habilidad',
                include: [
                  {
                    model: TipoHabilidad,
                    as: 'tipo'
                  }
                ]
              }
            ]
          },
          {
            model: InformeAreasMejora,
            as: 'areas_mejora'
          }
        ]
      });

      if (!informe) {
        return res.status(404).json({ error: "Informe no encontrado" });
      }

      res.json({
        informe: {
          id: informe.id,
          resumen: informe.resumen,
          fecha_generacion: informe.fecha_generacion,
          alumno: informe.cv.alumno.nombre,
          cv_archivo: informe.cv.archivo,
          fortalezas: informe.fortalezas.map(f => f.fortaleza),
          habilidades: informe.habilidades.map(h => ({
            habilidad: h.habilidad.habilidad,
            tipo: h.habilidad.tipo.nombre
          })),
          areas_mejora: informe.areas_mejora.map(a => a.area_mejora)
        }
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 📋 RF-107: Obtener todos los informes del alumno
  static async obtenerInformesAlumno(req, res) {
    try {
      const alumnoId = req.user.id;

      const informes = await Informe.findAll({
        include: [
          {
            model: CV,
            as: 'cv',
            where: { alumnoId },
            attributes: ['id', 'archivo', 'fecha_creacion']
          }
        ],
        order: [['fecha_generacion', 'DESC']]
      });

      const informesResumen = informes.map(informe => ({
        id: informe.id,
        resumen_corto: informe.resumen.substring(0, 100) + '...',
        fecha_generacion: informe.fecha_generacion,
        cv_archivo: informe.cv.archivo,
        cv_id: informe.cv.id
      }));

      res.json({ informes: informesResumen });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // ✉️ RF-107: Enviar informe por correo (placeholder)
  static async enviarInformePorCorreo(req, res) {
    try {
      const { informeId } = req.params;
      const { email_destino } = req.body;
      const alumnoId = req.user.id;

      if (!email_destino) {
        return res.status(400).json({ error: "Email de destino requerido" });
      }

      const informe = await Informe.findOne({
        where: { id: informeId },
        include: [
          {
            model: CV,
            as: 'cv',
            where: { alumnoId }
          }
        ]
      });

      if (!informe) {
        return res.status(404).json({ error: "Informe no encontrado" });
      }

      // TODO: Integrar servicio de email (nodemailer, sendgrid, etc.)
      // Por ahora simulamos el envío
      console.log(`Enviando informe ${informeId} a ${email_destino}`);

      res.json({
        message: "Informe enviado correctamente por correo electrónico",
        email_destino,
        informe_id: informeId
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 📥 RF-107: Descargar informe en PDF (placeholder)
  static async descargarInformePDF(req, res) {
    try {
      const { informeId } = req.params;
      const alumnoId = req.user.id;

      const informe = await Informe.findOne({
        where: { id: informeId },
        include: [
          {
            model: CV,
            as: 'cv',
            where: { alumnoId },
            include: [
              {
                model: Alumno,
                as: 'alumno'
              }
            ]
          },
          {
            model: InformeFortalezas,
            as: 'fortalezas'
          },
          {
            model: InformeHabilidades,
            as: 'habilidades',
            include: [
              {
                model: Habilidad,
                as: 'habilidad',
                include: [
                  {
                    model: TipoHabilidad,
                    as: 'tipo'
                  }
                ]
              }
            ]
          },
          {
            model: InformeAreasMejora,
            as: 'areas_mejora'
          }
        ]
      });

      if (!informe) {
        return res.status(404).json({ error: "Informe no encontrado" });
      }

      // TODO: Generar PDF con librería como puppeteer, jsPDF, etc.
      // Por ahora devolvemos la estructura que se usaría para generar el PDF
      
      const contenidoPDF = {
        titulo: `Informe de Análisis de CV - ${informe.cv.alumno.nombre}`,
        fecha: informe.fecha_generacion,
        resumen: informe.resumen,
        fortalezas: informe.fortalezas.map(f => f.fortaleza),
        habilidades_tecnicas: informe.habilidades
          .filter(h => h.habilidad.tipo.nombre === 'Técnica')
          .map(h => h.habilidad.habilidad),
        habilidades_blandas: informe.habilidades
          .filter(h => h.habilidad.tipo.nombre === 'Blanda')
          .map(h => h.habilidad.habilidad),
        areas_mejora: informe.areas_mejora.map(a => a.area_mejora)
      };

      res.json({
        message: "Contenido del PDF generado (pendiente implementación de generador PDF)",
        contenido: contenidoPDF
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 🗑️ Eliminar informe
  static async eliminarInforme(req, res) {
    try {
      const { informeId } = req.params;
      const alumnoId = req.user.id;

      const informe = await Informe.findOne({
        where: { id: informeId },
        include: [
          {
            model: CV,
            as: 'cv',
            where: { alumnoId }
          }
        ]
      });

      if (!informe) {
        return res.status(404).json({ error: "Informe no encontrado" });
      }

      // Eliminar registros relacionados primero
      await Promise.all([
        InformeFortalezas.destroy({ where: { informeId } }),
        InformeHabilidades.destroy({ where: { informeId } }),
        InformeAreasMejora.destroy({ where: { informeId } })
      ]);

      // Eliminar el informe
      await informe.destroy();

      res.json({ message: "Informe eliminado correctamente" });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 📈 Estadísticas de informes del alumno
  static async obtenerEstadisticas(req, res) {
    try {
      const alumnoId = req.user.id;

      const totalInformes = await Informe.count({
        include: [
          {
            model: CV,
            as: 'cv',
            where: { alumnoId }
          }
        ]
      });

      const totalCVs = await CV.count({
        where: { alumnoId }
      });

      const ultimoInforme = await Informe.findOne({
        include: [
          {
            model: CV,
            as: 'cv',
            where: { alumnoId }
          }
        ],
        order: [['fecha_generacion', 'DESC']]
      });

      res.json({
        estadisticas: {
          total_informes: totalInformes,
          total_cvs: totalCVs,
          ultimo_informe: ultimoInforme ? {
            id: ultimoInforme.id,
            fecha: ultimoInforme.fecha_generacion
          } : null
        }
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

}

module.exports = InformeController;