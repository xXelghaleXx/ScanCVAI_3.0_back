/**
 * Script de Actualización de Imports
 *
 * Actualiza todos los imports/requires para que funcionen con la nueva estructura
 *
 * Uso: node update-imports.js
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  🔄 ACTUALIZACIÓN DE IMPORTS                                 ║
║                                                               ║
║  Modo: ${DRY_RUN ? 'DRY RUN (solo mostrar cambios)' : 'EJECUCIÓN REAL'}                    ║
╚═══════════════════════════════════════════════════════════════╝
`);

// Mapeo de rutas antiguas a nuevas
const importMappings = {
  // Models
  './models': './database/models',
  '../models': '../database/models',
  '../../models': '../../database/models',

  // Middlewares
  './middlewares/authMiddleware': './shared/middlewares/auth.middleware',
  '../middlewares/authMiddleware': '../shared/middlewares/auth.middleware',
  './middlewares/adminMiddleware': './shared/middlewares/admin.middleware',
  '../middlewares/adminMiddleware': '../shared/middlewares/admin.middleware',
  './middlewares/validationMiddleware': './shared/middlewares/validation.middleware',
  '../middlewares/validationMiddleware': '../shared/middlewares/validation.middleware',
  './middlewares/uploadMiddleware': './shared/middlewares/upload.middleware',
  '../middlewares/uploadMiddleware': '../shared/middlewares/upload.middleware',
  './middlewares/monitoringMiddleware': './shared/middlewares/monitoring.middleware',
  '../middlewares/monitoringMiddleware': '../shared/middlewares/monitoring.middleware',

  // Services
  './services/LoggerService': './shared/services/logger.service',
  '../services/LoggerService': '../shared/services/logger.service',
  './services/UtilsService': './shared/services/utils.service',
  '../services/UtilsService': '../shared/services/utils.service',
  './services/LlamaService': './shared/services/llama.service',
  '../services/LlamaService': '../shared/services/llama.service',
  './services/FileExtractorService': './shared/services/file-extractor.service',
  '../services/FileExtractorService': '../shared/services/file-extractor.service',
  './services/InterviewAIService': './shared/services/interview-ai.service',
  '../services/InterviewAIService': '../shared/services/interview-ai.service',
  './services/AnalyticsService': './shared/services/analytics.service',
  '../services/AnalyticsService': '../shared/services/analytics.service',
  './services/ScoringService': './shared/services/scoring.service',
  '../services/ScoringService': '../shared/services/scoring.service',
  './services/pdfGenerator': './shared/services/pdf-generator.service',
  '../services/pdfGenerator': '../shared/services/pdf-generator.service',
  './services/authService': './shared/services/auth.service',
  '../services/authService': '../shared/services/auth.service',
  './services/Api': './shared/services/api.service',
  '../services/Api': '../shared/services/api.service',

  // Routes to Modules
  './routes/auth': './modules/auth/auth.routes',
  '../routes/auth': '../modules/auth/auth.routes',
  './routes/cv': './modules/cv/cv.routes',
  '../routes/cv': '../modules/cv/cv.routes',
  './routes/entrevistas': './modules/entrevista/entrevista.routes',
  '../routes/entrevistas': '../modules/entrevista/entrevista.routes',
  './routes/informes': './modules/informe/informe.routes',
  '../routes/informes': '../modules/informe/informe.routes',
  './routes/admin': './modules/admin/admin.routes',
  '../routes/admin': '../modules/admin/admin.routes',
  './routes/dashboard': './modules/dashboard/dashboard.routes',
  '../routes/dashboard': '../modules/dashboard/dashboard.routes',
  './routes/carreras': './modules/carrera/carrera.routes',
  '../routes/carreras': '../modules/carrera/carrera.routes',
  './routes/habilidades': './modules/habilidad/habilidad.routes',
  '../routes/habilidades': '../modules/habilidad/habilidad.routes',
  './routes/preguntas': './modules/pregunta/pregunta.routes',
  '../routes/preguntas': '../modules/pregunta/pregunta.routes',

  // Controllers to Modules
  '../controllers/authController': './auth.controller',
  '../controllers/CVController': './cv.controller',
  '../controllers/EntrevistaController': './entrevista.controller',
  '../controllers/InformeController': './informe.controller',
  '../controllers/AdminController': './admin.controller',
  '../controllers/DashboardController': './dashboard.controller',

  // Config
  '../config/database': '../config/database.config',
  '../../config/database': '../../config/database.config',
};

// Función para actualizar imports en un archivo
function updateImportsInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const changes = [];

  // Reemplazar cada mapeo
  Object.entries(importMappings).forEach(([oldPath, newPath]) => {
    // Patrones de require
    const requirePattern = new RegExp(`require\\(["']${oldPath.replace(/\//g, '\\/')}["']\\)`, 'g');
    if (requirePattern.test(content)) {
      content = content.replace(requirePattern, `require("${newPath}")`);
      modified = true;
      changes.push(`  ${oldPath} → ${newPath}`);
    }

    // Patrones de import (ES6)
    const importPattern = new RegExp(`from\\s+["']${oldPath.replace(/\//g, '\\/')}["']`, 'g');
    if (importPattern.test(content)) {
      content = content.replace(importPattern, `from "${newPath}"`);
      modified = true;
      changes.push(`  ${oldPath} → ${newPath}`);
    }
  });

  if (modified) {
    console.log(`\n📝 Actualizando: ${filePath}`);
    changes.forEach(change => console.log(change));

    if (!DRY_RUN) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }

  return modified;
}

// Función para recorrer directorio recursivamente
function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Ignorar node_modules y otras carpetas
      if (!['node_modules', '.git', 'logs', 'uploads'].includes(file)) {
        walkDir(filePath, callback);
      }
    } else if (file.endsWith('.js')) {
      callback(filePath);
    }
  });
}

console.log('\n🔍 Buscando archivos a actualizar...\n');

let filesModified = 0;
walkDir('src', (filePath) => {
  if (updateImportsInFile(filePath)) {
    filesModified++;
  }
});

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  ✅ ACTUALIZACIÓN COMPLETADA                                 ║
║                                                               ║
║  Archivos modificados: ${filesModified.toString().padEnd(42)} ║
║                                                               ║
║  ${DRY_RUN ? 'NOTA: Esto fue DRY RUN - ejecuta sin --dry-run' : 'Revisa los cambios y prueba la aplicación'}  ║
╚═══════════════════════════════════════════════════════════════╝
`);

if (DRY_RUN) {
  console.log('\n💡 Para ejecutar la actualización real, corre:');
  console.log('   node update-imports.js\n');
}
