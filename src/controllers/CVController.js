const { 
  CV, 
  Alumno, 
  Informe, 
  InformeFortalezas,
  InformeHabilidades,
  InformeAreasMejora,
  CVHabilidad, 
  Habilidad, 
  TipoHabilidad 
} = require("../models");
const llamaService = require("../services/LlamaService");
const fileExtractorService = require("../services/FileExtractorService");
const utilsService = require("../services/UtilsService");
const logger = require("../services/LoggerService");

class CVController {
  
  // 📄 RF-100: Subir CV
  static async subirCV(req, res) {
    try {
      const alumnoId = req.user.id;
      
      if (!req.file) {
        return res.status(400).json({ error: "Archivo CV requerido" });
      }

      // Crear registro CV en BD
      const cv = await CV.create({
        alumnoId,
        archivo: req.file.path,
        contenido_extraido: null // Se llenará después con IA
      });

      // Log del evento
      logger.cvUploaded(alumnoId, req.file.filename, req.file.sizeFormatted);

      res.status(201).json({
        message: "CV subido correctamente",
        cv: {
          id: cv.id,
          archivo: cv.archivo,
          fecha_creacion: cv.fecha_creacion,
          size: req.file.sizeFormatted,
          ready_for_processing: true
        }
      });

    } catch (error) {
      logger.error("Error subiendo CV", error, { 
        user_id: req.user?.id,
        filename: req.file?.filename 
      });
      res.status(500).json({ error: error.message });
    }
  }

  // 🧠 RF-102: Procesar CV con IA
  static async procesarCV(req, res) {
    const startTime = Date.now();
    const alumnoId = req.user.id;
    const { cvId } = req.params;

    try {
      // Verificar que el CV pertenece al alumno
      const cv = await CV.findOne({
        where: { id: cvId, alumnoId },
        include: [{ model: Alumno, as: 'alumno' }]
      });

      if (!cv) {
        return res.status(404).json({ error: "CV no encontrado" });
      }

      if (cv.contenido_extraido) {
        return res.status(400).json({ 
          error: "CV ya fue procesado anteriormente",
          processed_at: cv.updatedAt
        });
      }

      logger.info("Iniciando procesamiento de CV", {
        user_id: alumnoId,
        cv_id: cvId,
        filename: cv.archivo
      });

      // 1. Extraer texto del archivo
      logger.info("Extrayendo texto del archivo...");
      const extractionResult = await fileExtractorService.extractText(cv.archivo);
      
      if (!extractionResult.success) {
        logger.cvAnalysisFailed(alumnoId, cvId, new Error(extractionResult.error));
        return res.status(400).json({
          error: "No se pudo extraer el texto del CV",
          details: extractionResult.error
        });
      }

      const textoExtraido = fileExtractorService.cleanText(extractionResult.text);
      
      // 2. RF-101: Validar contenido extraído
      const validation = extractionResult.validation;
      
      if (!validation.isValid) {
        logger.warn("CV no cumple validaciones mínimas", {
          user_id: alumnoId,
          cv_id: cvId,
          score: validation.score,
          warnings: validation.warnings
        });
        
        // Aún procesamos pero advertimos al usuario
      }

      // 3. Analizar con IA (Llama 3.1)
      logger.aiRequestSent(alumnoId, 'cv_analysis', textoExtraido.length);
      
      const analisisIA = await llamaService.analizarCV(textoExtraido, cv.alumno.nombre);
      
      if (!analisisIA.success) {
        logger.aiError(alumnoId, 'cv_analysis', new Error(analisisIA.error));
        
        // Guardar contenido extraído aunque falle el análisis IA
        await cv.update({ contenido_extraido: textoExtraido });
        
        return res.status(500).json({
          error: "Error en análisis de IA, pero texto extraído correctamente",
          text_extracted: true,
          ai_error: analisisIA.error,
          fallback_content: analisisIA.fallback_content
        });
      }

      logger.aiResponseReceived(
        alumnoId, 
        'cv_analysis', 
        JSON.stringify(analisisIA.analisis).length,
        Date.now() - startTime
      );

      // 4. Guardar resultado en BD
      await cv.update({ 
        contenido_extraido: textoExtraido 
      });

      // 5. Crear/actualizar habilidades detectadas
      await CVController.procesarHabilidadesDetectadas(cv, analisisIA.analisis);

      // 6. Generar el informe automáticamente
      const informe = await CVController._generarInformeDesdeAnalisis(cv, analisisIA.analisis);

      const processingTime = Date.now() - startTime;
      logger.cvProcessed(alumnoId, cvId, processingTime);

      res.json({
        informe,
        message: "CV procesado correctamente",
        processing_time: processingTime + "ms",
        validation: {
          score: validation.score,
          is_valid: validation.isValid,
          warnings: validation.warnings,
          completeness: utilsService.calculateCVCompletenessScore(validation.requiredFields)
        },
        analisis: {
          fortalezas: analisisIA.analisis.fortalezas || [],
          habilidades_tecnicas: analisisIA.analisis.habilidades_tecnicas || [],
          habilidades_blandas: analisisIA.analisis.habilidades_blandas || [],
          areas_mejora: analisisIA.analisis.areas_mejora || [],
          experiencia_resumen: analisisIA.analisis.experiencia_resumen || "",
          educacion_resumen: analisisIA.analisis.educacion_resumen || ""
        },
        stats: extractionResult.stats,
        ready_for_report: true
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.cvAnalysisFailed(alumnoId, cvId, error);
      logger.error("Error procesando CV", error, {
        user_id: alumnoId,
        cv_id: cvId,
        processing_time: processingTime
      });
      res.status(500).json({ error: error.message });
    }
  }

  // 📊 RF-103: Generar informe detallado
  static async generarInforme(req, res) {
    try {
      const { cvId } = req.params;
      const alumnoId = req.user.id;

      // Verificar que el CV pertenece al alumno y está procesado
      const cv = await CV.findOne({
        where: { id: cvId, alumnoId },
        include: [
          { model: Alumno, as: 'alumno' },
          {
            model: Informe,
            as: 'informes',
            include: [
              { model: InformeFortalezas, as: 'fortalezas' },
              { model: InformeHabilidades, as: 'habilidades', include: [{ model: Habilidad, as: 'habilidad' }] },
              { model: InformeAreasMejora, as: 'areas_mejora' }
            ]
          }
        ]
      });

      if (!cv) {
        return res.status(404).json({ error: "CV no encontrado" });
      }

      if (!cv.contenido_extraido) {
        return res.status(400).json({ 
          error: "CV debe ser procesado primero antes de generar informe",
          needs_processing: true
        });
      }

      // Si ya existe un informe, devolverlo
      if (cv.informes && cv.informes.length > 0) {
        const informe = cv.informes[0]; // Tomar el más reciente
        
        logger.info("Informe existente encontrado", {
          user_id: alumnoId,
          cv_id: cvId,
          informe_id: informe.id
        });

        return res.json({
          message: "Informe ya generado previamente",
          informe: {
            id: informe.id,
            resumen: informe.resumen,
            fecha_creacion: informe.fecha_creacion,
            fortalezas: informe.fortalezas.map(f => f.fortaleza),
            areas_mejora: informe.areas_mejora.map(a => a.area_mejora),
            habilidades: informe.habilidades.map(h => h.habilidad.habilidad),
            cv_info: {
              archivo: cv.archivo,
              fecha_procesamiento: cv.updatedAt
            }
          }
        });
      }

      // Si no existe informe, regenerarlo desde el análisis IA
      logger.info("Regenerando informe desde contenido procesado", {
        user_id: alumnoId,
        cv_id: cvId
      });

      // Re-analizar con IA para generar nuevo informe
      const analisisIA = await llamaService.analizarCV(cv.contenido_extraido, cv.alumno.nombre);
      
      if (!analisisIA.success) {
        return res.status(500).json({
          error: "Error regenerando análisis para informe",
          details: analisisIA.error
        });
      }

      // Generar nuevo informe
      const nuevoInforme = await CVController._generarInformeDesdeAnalisis(cv, analisisIA.analisis);
      
      if (!nuevoInforme) {
        return res.status(500).json({ error: "Error generando informe" });
      }

      logger.success("Informe generado correctamente", {
        user_id: alumnoId,
        cv_id: cvId,
        informe_id: nuevoInforme.id
      });

      res.status(201).json({
        message: "Informe generado correctamente",
        informe: {
          id: nuevoInforme.id,
          resumen: nuevoInforme.resumen,
          fecha_creacion: nuevoInforme.fecha_creacion,
          fortalezas: analisisIA.analisis.fortalezas || [],
          areas_mejora: analisisIA.analisis.areas_mejora || [],
          habilidades_tecnicas: analisisIA.analisis.habilidades_tecnicas || [],
          habilidades_blandas: analisisIA.analisis.habilidades_blandas || []
        }
      });

    } catch (error) {
      logger.error("Error generando informe", error, {
        user_id: req.user?.id,
        cv_id: req.params.cvId
      });
      res.status(500).json({ error: error.message });
    }
  }

  // 🔧 Helper: Procesar habilidades detectadas por IA
  static async procesarHabilidadesDetectadas(cv, analisisIA) {
    try {
      // Obtener tipos de habilidades
      const tipoTecnica = await TipoHabilidad.findOne({ where: { nombre: 'Técnica' } });
      const tipoBlanda = await TipoHabilidad.findOne({ where: { nombre: 'Blanda' } });

      if (!tipoTecnica || !tipoBlanda) {
        logger.warn("Tipos de habilidad no encontrados en BD");
        return;
      }

      // Procesar habilidades técnicas
      if (analisisIA.habilidades_tecnicas) {
        for (const habilidadNombre of analisisIA.habilidades_tecnicas) {
          await CVController.crearOAsociarHabilidad(cv.id, habilidadNombre, tipoTecnica.id);
        }
      }

      // Procesar habilidades blandas
      if (analisisIA.habilidades_blandas) {
        for (const habilidadNombre of analisisIA.habilidades_blandas) {
          await CVController.crearOAsociarHabilidad(cv.id, habilidadNombre, tipoBlanda.id);
        }
      }

    } catch (error) {
      logger.error("Error procesando habilidades detectadas", error);
    }
  }

  // 🔧 Helper: Crear o asociar habilidad
  static async crearOAsociarHabilidad(cvId, habilidadNombre, tipoId) {
    try {
      // Buscar habilidad existente
      let habilidad = await Habilidad.findOne({
        where: { 
          habilidad: habilidadNombre.trim(),
          tipoId 
        }
      });

      // Crear si no existe
      if (!habilidad) {
        habilidad = await Habilidad.create({
          habilidad: habilidadNombre.trim(),
          tipoId
        });
      }

      // Asociar con CV si no está ya asociada
      await CVHabilidad.findOrCreate({
        where: {
          cvId: cvId,
          habilidadId: habilidad.id
        }
      });

    } catch (error) {
      logger.error("Error creando/asociando habilidad", error, {
        cv_id: cvId,
        habilidad: habilidadNombre
      });
    }
  }

  // 🔧 Helper: Generar informe desde un análisis de IA
  static async _generarInformeDesdeAnalisis(cv, analisis) {
    try {
      const resumenFinal = analisis.experiencia_resumen || `Análisis de CV para ${cv.alumno.nombre} completado.`;

      const informe = await Informe.create({
        cvId: cv.id,
        resumen: resumenFinal,
      });

      if (analisis.fortalezas && analisis.fortalezas.length > 0) {
        const fortalezasData = analisis.fortalezas.map(f => ({ informeId: informe.id, fortaleza: f.substring(0, 255) }));
        await InformeFortalezas.bulkCreate(fortalezasData);
      }

      if (analisis.areas_mejora && analisis.areas_mejora.length > 0) {
        const areasData = analisis.areas_mejora.map(a => ({ informeId: informe.id, area_mejora: a.substring(0, 255) }));
        await InformeAreasMejora.bulkCreate(areasData);
      }

      // Habilidades del informe (desde las ya procesadas en el CV)
      const cvHabilidades = await CVHabilidad.findAll({ where: { cvId: cv.id } });
      if (cvHabilidades.length > 0) {
        const habilidadesInforme = cvHabilidades.map(cvHab => ({
          informeId: informe.id,
          habilidadId: cvHab.habilidadId
        }));
        await InformeHabilidades.bulkCreate(habilidadesInforme);
      }

      logger.info("Informe generado automáticamente desde procesamiento de CV", { informe_id: informe.id, cv_id: cv.id });
      return informe;

    } catch (error) {
      logger.error("Error generando informe desde análisis", error, { cv_id: cv.id });
      return null;
    }
  }

  // 📋 Obtener CVs del alumno
  static async obtenerCVs(req, res) {
    try {
      const alumnoId = req.user.id;

      const cvs = await CV.findAll({
        where: { alumnoId },
        include: [
          {
            model: Informe,
            as: 'informes',
            required: false
          }
        ],
        order: [['fecha_creacion', 'DESC']]
      });

      res.json({ cvs });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 🗑️ Eliminar CV
  static async eliminarCV(req, res) {
    const sequelize = require('../config/database');
    const transaction = await sequelize.transaction();
    
    try {
      const { cvId } = req.params;
      const alumnoId = req.user.id;

      const cv = await CV.findOne({
        where: { id: cvId, alumnoId },
        include: [
          {
            model: Informe,
            as: 'informes',
            include: [
              { model: InformeFortalezas, as: 'fortalezas' },
              { model: InformeHabilidades, as: 'habilidades' },
              { model: InformeAreasMejora, as: 'areas_mejora' }
            ]
          },
          {
            model: CVHabilidad,
            as: 'cv_habilidades'
          }
        ]
      });

      if (!cv) {
        await transaction.rollback();
        return res.status(404).json({ error: "CV no encontrado" });
      }

      logger.info("Eliminando CV y registros relacionados", {
        user_id: alumnoId,
        cv_id: cvId,
        informes_count: cv.informes.length,
        habilidades_count: cv.cv_habilidades.length
      });

      // 1. Eliminar registros de informes en orden
      for (const informe of cv.informes) {
        // Eliminar detalles del informe
        await InformeFortalezas.destroy({ 
          where: { informeId: informe.id }, 
          transaction 
        });
        
        await InformeHabilidades.destroy({ 
          where: { informeId: informe.id }, 
          transaction 
        });
        
        await InformeAreasMejora.destroy({ 
          where: { informeId: informe.id }, 
          transaction 
        });
        
        // Eliminar el informe
        await informe.destroy({ transaction });
      }

      // 2. Eliminar relaciones CV-Habilidades
      await CVHabilidad.destroy({ 
        where: { cvId }, 
        transaction 
      });

      // 3. Eliminar archivo físico del servidor
      const { deleteFile } = require('../middlewares/uploadMiddleware');
      if (cv.archivo) {
        deleteFile(cv.archivo);
      }

      // 4. Finalmente eliminar el CV
      await cv.destroy({ transaction });

      await transaction.commit();

      logger.success("CV eliminado correctamente", {
        user_id: alumnoId,
        cv_id: cvId,
        archivo: cv.archivo
      });

      res.json({ 
        message: "CV y todos sus registros relacionados eliminados correctamente",
        deleted: {
          cv_id: cvId,
          informes_eliminados: cv.informes.length,
          habilidades_eliminadas: cv.cv_habilidades.length,
          archivo_eliminado: !!cv.archivo
        }
      });

    } catch (error) {
      await transaction.rollback();
      logger.error("Error eliminando CV", error, {
        user_id: req.user?.id,
        cv_id: req.params.cvId
      });
      res.status(500).json({ error: error.message });
    }
  }

}

module.exports = CVController;