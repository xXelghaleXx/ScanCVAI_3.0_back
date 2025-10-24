const puppeteer = require('puppeteer');

/**
 * Genera un PDF profesional y clásico para el informe de CV
 */
class PDFGenerator {

  /**
   * Genera recomendaciones prácticas basadas en áreas de mejora
   */
  static generatePracticalRecommendations(areas_mejora) {
    const recommendations = {
      'formato': {
        title: 'Formato y Presentación',
        tips: [
          'Utilice un diseño limpio y profesional con márgenes adecuados (2-3 cm)',
          'Mantenga una extensión de 1-2 páginas para perfiles junior/mid, 2-3 para senior',
          'Use una tipografía legible como Arial, Calibri o Helvetica (tamaño 10-12pt)',
          'Organice la información en secciones claramente diferenciadas',
          'Incluya suficiente espacio en blanco para facilitar la lectura'
        ]
      },
      'contenido': {
        title: 'Contenido y Estructura',
        tips: [
          'Añada un resumen profesional al inicio (3-4 líneas) destacando su propuesta de valor',
          'Incluya datos de contacto completos: teléfono, email profesional, LinkedIn',
          'Ordene su experiencia de forma cronológica inversa (más reciente primero)',
          'Detalle logros medibles con números y porcentajes cuando sea posible',
          'Personalice el CV para cada posición a la que aplique'
        ]
      },
      'experiencia': {
        title: 'Experiencia Profesional',
        tips: [
          'Use verbos de acción al inicio de cada punto (Desarrollé, Implementé, Lideré)',
          'Cuantifique sus logros: "Aumenté las ventas en un 25%" es mejor que "Mejoré las ventas"',
          'Describa proyectos específicos y su impacto en la organización',
          'Incluya tecnologías, metodologías y herramientas utilizadas',
          'Evite descripciones genéricas; sea específico sobre sus responsabilidades'
        ]
      },
      'habilidades': {
        title: 'Habilidades y Competencias',
        tips: [
          'Organice las habilidades por categorías (técnicas, blandas, idiomas)',
          'Incluya el nivel de dominio para cada habilidad cuando sea relevante',
          'Destaque habilidades específicas demandadas en su sector',
          'Respalde las habilidades blandas con ejemplos concretos',
          'Actualice constantemente con nuevas certificaciones y conocimientos'
        ]
      },
      'educacion': {
        title: 'Formación Académica',
        tips: [
          'Incluya el título completo, institución, fecha de graduación y menciones',
          'Añada cursos relevantes, proyectos académicos destacados o tesis',
          'Liste certificaciones profesionales con fechas de obtención',
          'Mencione formación continua: cursos online, workshops, seminarios',
          'Incluya calificaciones relevantes si son destacables (promedio alto, honores)'
        ]
      },
      'errores': {
        title: 'Errores Comunes a Evitar',
        tips: [
          'No incluya información personal innecesaria (edad, estado civil, foto en ciertos países)',
          'Evite errores ortográficos y gramaticales; revise múltiples veces',
          'No use jerga técnica excesiva que dificulte la comprensión',
          'Elimine información desactualizada o irrelevante',
          'No mienta sobre sus habilidades o experiencia; sea honesto'
        ]
      },
      'optimizacion': {
        title: 'Optimización para ATS (Applicant Tracking Systems)',
        tips: [
          'Use palabras clave del anuncio de trabajo en su CV',
          'Evite formatos complejos (tablas, columnas múltiples) que dificulten el parsing',
          'Utilice títulos de sección estándar: "Experiencia", "Educación", "Habilidades"',
          'Guarde el CV en formato PDF para mantener el formato',
          'Incluya acrónimos y sus versiones completas (ej: "API - Application Programming Interface")'
        ]
      }
    };

    // Detectar qué áreas necesitan mejora
    const relevantAreas = new Set();

    if (!areas_mejora || areas_mejora.length === 0) {
      return Object.values(recommendations);
    }

    areas_mejora.forEach(area => {
      const areaLower = area.toLowerCase();
      if (areaLower.includes('formato') || areaLower.includes('diseño') || areaLower.includes('presentación')) {
        relevantAreas.add('formato');
      }
      if (areaLower.includes('contenido') || areaLower.includes('estructura') || areaLower.includes('información')) {
        relevantAreas.add('contenido');
      }
      if (areaLower.includes('experiencia') || areaLower.includes('trabajo') || areaLower.includes('laboral')) {
        relevantAreas.add('experiencia');
      }
      if (areaLower.includes('habilidad') || areaLower.includes('competencia') || areaLower.includes('skill')) {
        relevantAreas.add('habilidades');
      }
      if (areaLower.includes('educación') || areaLower.includes('formación') || areaLower.includes('académico')) {
        relevantAreas.add('educacion');
      }
    });

    // Siempre incluir optimización y errores comunes
    relevantAreas.add('optimizacion');
    relevantAreas.add('errores');

    // Si no hay áreas específicas, devolver todas
    if (relevantAreas.size <= 2) {
      return Object.values(recommendations);
    }

    return Array.from(relevantAreas).map(key => recommendations[key]);
  }

  /**
   * Genera análisis detallado de áreas de mejora
   */
  static generateDetailedImprovements(areas_mejora) {
    if (!areas_mejora || areas_mejora.length === 0) {
      return [];
    }

    return areas_mejora.map((area, index) => {
      return {
        area: area,
        priority: index < 3 ? 'Alta' : 'Media',
        actionable: this.makeActionable(area)
      };
    });
  }

  /**
   * Convierte un área de mejora en pasos accionables
   */
  static makeActionable(area) {
    const areaLower = area.toLowerCase();
    const actions = [];

    // Análisis contextual para generar acciones específicas
    if (areaLower.includes('experiencia') || areaLower.includes('detalle')) {
      actions.push('Amplíe cada experiencia laboral con 3-5 puntos descriptivos');
      actions.push('Incluya métricas específicas de logros alcanzados');
      actions.push('Describa proyectos relevantes y su impacto');
    }

    if (areaLower.includes('habilidad') || areaLower.includes('competencia')) {
      actions.push('Añada una sección específica de habilidades técnicas');
      actions.push('Incluya certificaciones y nivel de dominio');
      actions.push('Respalde con ejemplos de aplicación práctica');
    }

    if (areaLower.includes('formato') || areaLower.includes('estructura')) {
      actions.push('Reorganice el contenido con secciones claras');
      actions.push('Mejore el espaciado y la legibilidad visual');
      actions.push('Use viñetas para facilitar la lectura rápida');
    }

    if (areaLower.includes('objetivo') || areaLower.includes('perfil')) {
      actions.push('Incluya un resumen profesional al inicio del CV');
      actions.push('Destaque su propuesta de valor única');
      actions.push('Alinee el objetivo con el puesto objetivo');
    }

    if (areaLower.includes('educación') || areaLower.includes('formación')) {
      actions.push('Complete información académica con fechas y menciones');
      actions.push('Añada cursos relevantes y certificaciones');
      actions.push('Incluya proyectos académicos destacados');
    }

    // Si no hay acciones específicas, dar consejos generales
    if (actions.length === 0) {
      actions.push('Revise esta sección y amplíe con información relevante');
      actions.push('Asegúrese de que esté actualizada y completa');
      actions.push('Consulte ejemplos de CVs en su sector');
    }

    return actions;
  }

  /**
   * Genera HTML clásico y profesional para el informe
   */
  static generateHTML(data) {
    const {
      titulo,
      fecha,
      alumno,
      resumen,
      fortalezas,
      habilidades_tecnicas,
      habilidades_blandas,
      areas_mejora
    } = data;

    const detailedImprovements = this.generateDetailedImprovements(areas_mejora);
    const practicalRecommendations = this.generatePracticalRecommendations(areas_mejora);

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      background: white;
      padding: 40px 60px;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #2c3e50;
    }

    .header h1 {
      font-size: 24pt;
      color: #2c3e50;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .header .subtitle {
      font-size: 12pt;
      color: #7f8c8d;
      margin-bottom: 5px;
    }

    .header .date {
      font-size: 10pt;
      color: #95a5a6;
    }

    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 14pt;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 12px;
      padding-bottom: 5px;
      border-bottom: 1px solid #bdc3c7;
    }

    .content-text {
      font-size: 11pt;
      color: #555;
      text-align: justify;
      margin-bottom: 10px;
    }

    .list {
      margin-left: 20px;
      margin-top: 8px;
    }

    .list-item {
      margin-bottom: 8px;
      font-size: 11pt;
      color: #555;
      line-height: 1.5;
    }

    .list-item::before {
      content: "• ";
      color: #3498db;
      font-weight: bold;
      display: inline-block;
      width: 1em;
      margin-left: -1em;
    }

    .skills-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 10px;
    }

    .skills-column {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      border-left: 3px solid #3498db;
    }

    .skills-column h4 {
      font-size: 11pt;
      color: #2c3e50;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .skills-list {
      font-size: 10pt;
      color: #555;
      line-height: 1.7;
    }

    .improvement-card {
      background: #f8f9fa;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 4px;
      border-left: 4px solid #e74c3c;
      page-break-inside: avoid;
    }

    .improvement-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .improvement-title {
      font-size: 11pt;
      font-weight: 600;
      color: #2c3e50;
      margin: 0;
    }

    .priority-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 9pt;
      font-weight: 600;
    }

    .priority-alta {
      background: #fee;
      color: #c0392b;
    }

    .priority-media {
      background: #fef5e7;
      color: #d68910;
    }

    .action-list {
      margin-top: 8px;
      padding-left: 15px;
    }

    .action-item {
      font-size: 10pt;
      color: #555;
      margin-bottom: 6px;
      line-height: 1.5;
    }

    .action-item::before {
      content: "→ ";
      color: #e74c3c;
      font-weight: bold;
      margin-right: 5px;
    }

    .recommendation-section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }

    .recommendation-title {
      font-size: 12pt;
      font-weight: 600;
      color: #27ae60;
      margin-bottom: 10px;
      padding: 8px 12px;
      background: #e8f8f5;
      border-radius: 4px;
      border-left: 4px solid #27ae60;
    }

    .recommendation-list {
      margin-left: 15px;
      margin-top: 8px;
    }

    .recommendation-item {
      font-size: 10pt;
      color: #555;
      margin-bottom: 8px;
      line-height: 1.6;
      padding-left: 10px;
    }

    .recommendation-item::before {
      content: "✓ ";
      color: #27ae60;
      font-weight: bold;
      margin-right: 5px;
      margin-left: -15px;
    }

    .subsection {
      margin-top: 15px;
      padding-left: 10px;
    }

    .subsection-title {
      font-size: 11pt;
      font-weight: 600;
      color: #34495e;
      margin-bottom: 8px;
    }

    .highlight-box {
      background: #fff9e6;
      border: 1px solid #f1c40f;
      border-radius: 4px;
      padding: 12px;
      margin: 15px 0;
      font-size: 10pt;
      color: #555;
    }

    .highlight-box strong {
      color: #d68910;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #bdc3c7;
      text-align: center;
      font-size: 9pt;
      color: #95a5a6;
    }

    @media print {
      body {
        padding: 30px 40px;
      }
    }
  </style>
</head>
<body>
  <!-- Encabezado -->
  <div class="header">
    <h1>Informe de Análisis de CV</h1>
    <div class="subtitle">${alumno || 'Candidato'}</div>
    <div class="date">Fecha de generación: ${new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}</div>
  </div>

  <!-- Resumen Ejecutivo -->
  <div class="section">
    <h2 class="section-title">Resumen Ejecutivo</h2>
    <p class="content-text">${resumen || 'No disponible'}</p>
  </div>

  <!-- Fortalezas -->
  ${fortalezas && fortalezas.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Fortalezas Identificadas</h2>
    <div class="list">
      ${fortalezas.map(f => `<div class="list-item">${f}</div>`).join('')}
    </div>
  </div>
  ` : ''}

  <!-- Habilidades -->
  ${(habilidades_tecnicas && habilidades_tecnicas.length > 0) || (habilidades_blandas && habilidades_blandas.length > 0) ? `
  <div class="section">
    <h2 class="section-title">Habilidades</h2>
    <div class="skills-grid">
      ${habilidades_tecnicas && habilidades_tecnicas.length > 0 ? `
      <div class="skills-column">
        <h4>Habilidades Técnicas</h4>
        <div class="skills-list">${habilidades_tecnicas.join(' • ')}</div>
      </div>
      ` : ''}

      ${habilidades_blandas && habilidades_blandas.length > 0 ? `
      <div class="skills-column">
        <h4>Habilidades Blandas</h4>
        <div class="skills-list">${habilidades_blandas.join(' • ')}</div>
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  <!-- Áreas de Mejora Detalladas -->
  ${detailedImprovements && detailedImprovements.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Plan de Mejora Detallado</h2>
    <p class="content-text" style="margin-bottom: 15px;">
      A continuación se presentan las áreas específicas identificadas para mejorar su CV,
      organizadas por prioridad y acompañadas de acciones concretas que puede implementar de inmediato.
    </p>

    ${detailedImprovements.map(improvement => `
    <div class="improvement-card">
      <div class="improvement-header">
        <h3 class="improvement-title">${improvement.area}</h3>
        <span class="priority-badge priority-${improvement.priority.toLowerCase()}">${improvement.priority} Prioridad</span>
      </div>
      <div class="action-list">
        <p style="font-size: 10pt; color: #7f8c8d; margin-bottom: 8px; font-weight: 500;">Acciones recomendadas:</p>
        ${improvement.actionable.map(action => `<div class="action-item">${action}</div>`).join('')}
      </div>
    </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Recomendaciones Prácticas -->
  ${practicalRecommendations && practicalRecommendations.length > 0 ? `
  <div class="section" style="page-break-before: always;">
    <h2 class="section-title">Guía Práctica de Optimización</h2>

    <div class="highlight-box">
      <strong>💡 Consejo importante:</strong> Estas recomendaciones están basadas en las mejores prácticas
      actuales del mercado laboral y sistemas ATS (Applicant Tracking Systems). Implementarlas aumentará
      significativamente sus oportunidades de conseguir entrevistas.
    </div>

    ${practicalRecommendations.map(rec => `
    <div class="recommendation-section">
      <h3 class="recommendation-title">${rec.title}</h3>
      <div class="recommendation-list">
        ${rec.tips.map(tip => `<div class="recommendation-item">${tip}</div>`).join('')}
      </div>
    </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Próximos Pasos -->
  <div class="section">
    <h2 class="section-title">Próximos Pasos Recomendados</h2>

    <div class="subsection">
      <h4 class="subsection-title">1. Revisión Inmediata (Hoy)</h4>
      <div class="recommendation-list">
        <div class="recommendation-item">Corrija errores ortográficos y gramaticales</div>
        <div class="recommendation-item">Actualice información de contacto y datos personales</div>
        <div class="recommendation-item">Revise el formato y asegúrese de que sea consistente</div>
      </div>
    </div>

    <div class="subsection">
      <h4 class="subsection-title">2. Mejoras a Corto Plazo (Esta Semana)</h4>
      <div class="recommendation-list">
        <div class="recommendation-item">Amplíe descripciones de experiencia laboral con logros cuantificables</div>
        <div class="recommendation-item">Añada o actualice la sección de habilidades técnicas</div>
        <div class="recommendation-item">Incluya un resumen profesional atractivo</div>
        <div class="recommendation-item">Optimice palabras clave según el puesto objetivo</div>
      </div>
    </div>

    <div class="subsection">
      <h4 class="subsection-title">3. Desarrollo Continuo (Este Mes)</h4>
      <div class="recommendation-list">
        <div class="recommendation-item">Obtenga certificaciones relevantes en su campo</div>
        <div class="recommendation-item">Participe en proyectos que pueda añadir a su experiencia</div>
        <div class="recommendation-item">Solicite recomendaciones en LinkedIn</div>
        <div class="recommendation-item">Mantenga su CV actualizado con nuevos logros</div>
      </div>
    </div>
  </div>

  <!-- Recursos Adicionales -->
  <div class="section">
    <h2 class="section-title">Recursos Adicionales</h2>

    <div class="content-text">
      <strong>Herramientas recomendadas:</strong>
      <ul style="margin-top: 8px; margin-left: 20px;">
        <li style="margin-bottom: 5px;">LinkedIn Profile Review: Optimice su perfil profesional</li>
        <li style="margin-bottom: 5px;">Grammarly: Corrección ortográfica y gramatical avanzada</li>
        <li style="margin-bottom: 5px;">Canva/Google Docs: Plantillas profesionales de CV</li>
        <li style="margin-bottom: 5px;">Jobscan: Análisis de compatibilidad con ATS</li>
      </ul>
    </div>

    <div class="highlight-box" style="margin-top: 15px;">
      <strong>📌 Recordatorio:</strong> Personalice su CV para cada aplicación. Un CV genérico
      tiene menos probabilidades de destacar. Adapte las palabras clave y el enfoque según
      la descripción del puesto al que aplica.
    </div>
  </div>

  <!-- Pie de página -->
  <div class="footer">
    <p><strong>Informe generado automáticamente por el Sistema de Análisis de CV</strong></p>
    <p>Este análisis está diseñado para ayudarle a optimizar su CV y aumentar sus oportunidades laborales.</p>
    <p>Para más información o soporte adicional, contacte con el departamento de Recursos Humanos o Desarrollo Profesional.</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Genera un PDF a partir de los datos del informe
   * @param {Object} data - Datos del informe
   * @returns {Promise<Buffer>} Buffer del PDF generado
   */
  static async generatePDF(data) {
    let browser;

    try {
      // Generar HTML
      const html = this.generateHTML(data);

      // Configuración para encontrar Chrome en Render
      const launchOptions = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      };

      // En producción (Render), usar variable de entorno si existe
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }

      // Lanzar navegador
      browser = await puppeteer.launch(launchOptions);

      const page = await browser.newPage();

      // Configurar contenido
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });

      // Generar PDF con configuración clásica
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        displayHeaderFooter: false
      });

      return pdfBuffer;

    } catch (error) {
      console.error('Error generando PDF:', error);
      throw new Error(`Error al generar PDF: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = PDFGenerator;
