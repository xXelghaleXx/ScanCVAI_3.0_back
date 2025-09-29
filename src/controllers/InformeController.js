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
const puppeteer = require('puppeteer');
const logger = require("../services/LoggerService");

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
      logger.error("Error obteniendo informe", error, {
        user_id: req.user?.id,
        informe_id: req.params.informeId
      });
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
      logger.error("Error obteniendo informes del alumno", error, {
        user_id: req.user?.id
      });
      res.status(500).json({ error: error.message });
    }
  }

  // ✉️ RF-107: Enviar informe por correo
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
      logger.info("Solicitud de envío de informe por email", {
        user_id: alumnoId,
        informe_id: informeId,
        email_destino
      });

      res.json({
        message: "Informe enviado correctamente por correo electrónico",
        email_destino,
        informe_id: informeId
      });

    } catch (error) {
      logger.error("Error enviando informe por correo", error, {
        user_id: req.user?.id,
        informe_id: req.params.informeId
      });
      res.status(500).json({ error: error.message });
    }
  }

  // 📥 RF-107: Descargar informe en PDF
  static async descargarInformePDF(req, res) {
    try {
      const { informeId } = req.params;
      const alumnoId = req.user.id;

      logger.info("Iniciando generación de PDF", {
        user_id: alumnoId,
        informe_id: informeId
      });

      // Obtener el informe completo con todas las relaciones
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

      // Separar habilidades por tipo
      const habilidadesTecnicas = informe.habilidades
        .filter(h => h.habilidad.tipo.nombre === 'Técnica')
        .map(h => h.habilidad.habilidad);
        
      const habilidadesBlandas = informe.habilidades
        .filter(h => h.habilidad.tipo.nombre === 'Blanda')
        .map(h => h.habilidad.habilidad);

      // Generar HTML del informe con diseño mejorado
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Informe de Análisis de CV</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 40px;
            background: #ffffff;
          }
          
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px 0;
            border-bottom: 3px solid #2563eb;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            margin: -40px -40px 40px -40px;
            padding: 40px;
          }
          
          .header h1 {
            color: #2563eb;
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
          }
          
          .header .subtitle {
            color: #64748b;
            font-size: 1.1em;
            margin-bottom: 20px;
          }
          
          .header .info {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: inline-block;
            margin-top: 20px;
          }
          
          .header .info p {
            margin: 5px 0;
            font-weight: 600;
          }
          
          .section {
            margin-bottom: 35px;
            page-break-inside: avoid;
          }
          
          .section h2 {
            color: #1e293b;
            font-size: 1.5em;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
            display: flex;
            align-items: center;
          }
          
          .section h2::before {
            content: '';
            width: 4px;
            height: 24px;
            background: #2563eb;
            margin-right: 12px;
            border-radius: 2px;
          }
          
          .resumen {
            background: #f8fafc;
            padding: 25px;
            border-radius: 10px;
            border-left: 5px solid #2563eb;
            font-size: 1.05em;
            line-height: 1.7;
          }
          
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 20px;
          }
          
          .card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          }
          
          .card h3 {
            color: #2563eb;
            margin-bottom: 15px;
            font-size: 1.2em;
            display: flex;
            align-items: center;
          }
          
          .card h3::before {
            content: '●';
            color: #2563eb;
            margin-right: 8px;
            font-size: 1.5em;
          }
          
          .item-list {
            list-style: none;
          }
          
          .item-list li {
            background: #f1f5f9;
            margin: 8px 0;
            padding: 12px 15px;
            border-radius: 6px;
            border-left: 3px solid #2563eb;
            transition: all 0.3s ease;
          }
          
          .item-list li:hover {
            background: #e2e8f0;
          }
          
          .fortaleza {
            border-left-color: #10b981;
          }
          
          .habilidad-tecnica {
            border-left-color: #3b82f6;
          }
          
          .habilidad-blanda {
            border-left-color: #8b5cf6;
          }
          
          .mejora {
            border-left-color: #f59e0b;
          }
          
          .footer {
            margin-top: 50px;
            padding-top: 30px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 0.9em;
          }
          
          .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 20px 0;
          }
          
          .stat-card {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          
          .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #2563eb;
          }
          
          .stat-label {
            color: #64748b;
            font-size: 0.9em;
            margin-top: 5px;
          }
          
          @media print {
            body { margin: 0; padding: 20px; }
            .header { margin: -20px -20px 30px -20px; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 Informe de Análisis de CV</h1>
          <p class="subtitle">Análisis Profesional con Inteligencia Artificial</p>
          <div class="info">
            <p><strong>👤 Candidato:</strong> ${informe.cv.alumno.nombre}</p>
            <p><strong>📅 Fecha de Generación:</strong> ${new Date(informe.fecha_generacion).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p><strong>📁 Archivo CV:</strong> ${informe.cv.archivo.split('/').pop()}</p>
          </div>
        </div>

        <div class="section">
          <h2>📝 Resumen Ejecutivo</h2>
          <div class="resumen">
            ${informe.resumen}
          </div>
        </div>

        <div class="stats">
          <div class="stat-card">
            <div class="stat-number">${informe.fortalezas.length}</div>
            <div class="stat-label">Fortalezas</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${habilidadesTecnicas.length + habilidadesBlandas.length}</div>
            <div class="stat-label">Habilidades</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${informe.areas_mejora.length}</div>
            <div class="stat-label">Áreas de Mejora</div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <h3>🌟 Fortalezas Identificadas</h3>
            <ul class="item-list">
              ${informe.fortalezas.map(f => `<li class="fortaleza">${f.fortaleza}</li>`).join('')}
            </ul>
            ${informe.fortalezas.length === 0 ? '<p><em>No se identificaron fortalezas específicas.</em></p>' : ''}
          </div>

          <div class="card">
            <h3>🔧 Áreas de Mejora</h3>
            <ul class="item-list">
              ${informe.areas_mejora.map(a => `<li class="mejora">${a.area_mejora}</li>`).join('')}
            </ul>
            ${informe.areas_mejora.length === 0 ? '<p><em>No se identificaron áreas de mejora específicas.</em></p>' : ''}
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <h3>💻 Habilidades Técnicas</h3>
            <ul class="item-list">
              ${habilidadesTecnicas.map(h => `<li class="habilidad-tecnica">${h}</li>`).join('')}
            </ul>
            ${habilidadesTecnicas.length === 0 ? '<p><em>No se identificaron habilidades técnicas específicas.</em></p>' : ''}
          </div>

          <div class="card">
            <h3>🤝 Habilidades Blandas</h3>
            <ul class="item-list">
              ${habilidadesBlandas.map(h => `<li class="habilidad-blanda">${h}</li>`).join('')}
            </ul>
            ${habilidadesBlandas.length === 0 ? '<p><em>No se identificaron habilidades blandas específicas.</em></p>' : ''}
          </div>
        </div>

        <div class="footer">
          <p>📊 <strong>Informe generado automáticamente</strong> por el Sistema de Análisis de CV con IA</p>
          <p>🤖 Análisis realizado con tecnología Llama 3.1 • ⚡ Procesado en tiempo real</p>
          <p>📧 Para consultas sobre este informe, contacta con el equipo de soporte</p>
        </div>
      </body>
      </html>`;

      // Configuración de Puppeteer para producción
      const puppeteerOptions = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      };

      // Generar PDF con Puppeteer
      const browser = await puppeteer.launch(puppeteerOptions);
      const page = await browser.newPage();
      
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { 
          top: '20px', 
          bottom: '20px', 
          left: '20px', 
          right: '20px' 
        },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
            Página <span class="pageNumber"></span> de <span class="totalPages"></span>
          </div>
        `
      });
      
      await browser.close();

      // Log de éxito
      logger.success("PDF generado exitosamente", {
        user_id: alumnoId,
        informe_id: informeId,
        pdf_size: `${Math.round(pdfBuffer.length / 1024)}KB`
      });

      // Configurar headers para descarga
      const fileName = `Informe_CV_${informe.cv.alumno.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Enviar PDF
      res.send(pdfBuffer);

    } catch (error) {
      logger.error("Error generando PDF", error, {
        user_id: req.user?.id,
        informe_id: req.params.informeId
      });

      // Si es error de Puppeteer, dar mensaje más específico
      if (error.message.includes('puppeteer')) {
        return res.status(500).json({ 
          error: "Error generando PDF. El servicio de generación no está disponible temporalmente.",
          code: "PDF_GENERATION_ERROR"
        });
      }

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

      logger.success("Informe eliminado correctamente", {
        user_id: alumnoId,
        informe_id: informeId
      });

      res.json({ message: "Informe eliminado correctamente" });

    } catch (error) {
      logger.error("Error eliminando informe", error, {
        user_id: req.user?.id,
        informe_id: req.params.informeId
      });
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
      logger.error("Error obteniendo estadísticas de informes", error, {
        user_id: req.user?.id
      });
      res.status(500).json({ error: error.message });
    }
  }

}

module.exports = InformeController;