/**
 * Script de Migración de Estructura del Backend
 *
 * Este script reorganiza la estructura de carpetas del backend
 * siguiendo las mejores prácticas profesionales.
 *
 * IMPORTANTE: Hacer backup antes de ejecutar
 *
 * Uso: node migrate-structure.js
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  📦 MIGRACIÓN DE ESTRUCTURA - BACKEND ALUMNOS                ║
║                                                               ║
║  Modo: ${DRY_RUN ? 'DRY RUN (solo mostrar cambios)' : 'EJECUCIÓN REAL'}                    ║
╚═══════════════════════════════════════════════════════════════╝
`);

// Crear directorio si no existe
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    if (!DRY_RUN) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    console.log(`✅ Crear directorio: ${dirPath}`);
  }
}

// Mover archivo
function moveFile(from, to) {
  const fromPath = path.resolve(from);
  const toPath = path.resolve(to);

  if (!fs.existsSync(fromPath)) {
    console.log(`⚠️  Archivo no existe: ${from}`);
    return;
  }

  if (!DRY_RUN) {
    // Asegurar que el directorio de destino existe
    ensureDir(path.dirname(toPath));
    fs.copyFileSync(fromPath, toPath);
  }
  console.log(`📄 Mover: ${from} → ${to}`);
}

// Copiar directorio recursivamente
function copyDir(from, to) {
  const fromPath = path.resolve(from);
  const toPath = path.resolve(to);

  if (!fs.existsSync(fromPath)) {
    console.log(`⚠️  Directorio no existe: ${from}`);
    return;
  }

  if (!DRY_RUN) {
    ensureDir(toPath);

    const files = fs.readdirSync(fromPath);
    files.forEach(file => {
      const srcFile = path.join(fromPath, file);
      const destFile = path.join(toPath, file);

      if (fs.statSync(srcFile).isDirectory()) {
        copyDir(srcFile, destFile);
      } else {
        fs.copyFileSync(srcFile, destFile);
      }
    });
  }
  console.log(`📁 Copiar directorio: ${from} → ${to}`);
}

console.log('\n📋 PASO 1: Crear estructura de carpetas\n');

// Crear nueva estructura
const dirs = [
  'src/config',
  'src/database/models',
  'src/database/migrations',
  'src/database/seeders',
  'src/modules/auth',
  'src/modules/cv',
  'src/modules/entrevista',
  'src/modules/informe',
  'src/modules/admin',
  'src/modules/dashboard',
  'src/modules/carrera',
  'src/modules/habilidad',
  'src/modules/pregunta',
  'src/shared/middlewares',
  'src/shared/services',
  'src/shared/utils',
  'src/scripts',
  'logs',
  'uploads/cvs'
];

dirs.forEach(dir => ensureDir(dir));

console.log('\n📋 PASO 2: Mover modelos a src/database/models\n');

// Mover todos los modelos
const models = [
  'Alumno.js', 'Token.js', 'TipoHabilidad.js', 'Habilidad.js',
  'CV.js', 'CVHabilidad.js', 'Informe.js', 'InformeFortalezas.js',
  'InformeHabilidades.js', 'InformeAreasMejora.js', 'Carrera.js',
  'PreguntaEntrevista.js', 'Entrevista.js', 'RespuestaEntrevista.js',
  'HistorialEntrevista.js', 'index.js'
];

models.forEach(model => {
  moveFile(`src/models/${model}`, `src/database/models/${model}`);
});

console.log('\n📋 PASO 3: Mover migraciones\n');

// Mover migraciones
if (fs.existsSync('migrations')) {
  copyDir('migrations', 'src/database/migrations');
}

console.log('\n📋 PASO 4: Mover middlewares\n');

// Mover middlewares
const middlewares = [
  'authMiddleware.js',
  'adminMiddleware.js',
  'validationMiddleware.js',
  'uploadMiddleware.js',
  'monitoringMiddleware.js'
];

middlewares.forEach(middleware => {
  const newName = middleware.replace('Middleware.js', '.middleware.js');
  moveFile(`src/middlewares/${middleware}`, `src/shared/middlewares/${newName}`);
});

console.log('\n📋 PASO 5: Mover services\n');

// Mover services
const services = [
  'AnalyticsService.js',
  'Api.js',
  'authService.js',
  'FileExtractorService.js',
  'InterviewAIService.js',
  'LlamaService.js',
  'LoggerService.js',
  'pdfGenerator.js',
  'ScoringService.js',
  'UtilsService.js'
];

services.forEach(service => {
  const newName = service === 'Api.js' ? 'api.service.js' :
                  service === 'authService.js' ? 'auth.service.js' :
                  service === 'pdfGenerator.js' ? 'pdf-generator.service.js' :
                  service.replace('Service.js', '.service.js').toLowerCase();
  moveFile(`src/services/${service}`, `src/shared/services/${newName}`);
});

console.log('\n📋 PASO 6: Reorganizar en módulos\n');

// Mover controllers y routes a sus módulos correspondientes
const modules = [
  { name: 'auth', controller: 'authController.js', route: 'auth.js' },
  { name: 'cv', controller: 'CVController.js', route: 'cv.js' },
  { name: 'entrevista', controller: 'EntrevistaController.js', route: 'entrevistas.js' },
  { name: 'informe', controller: 'InformeController.js', route: 'informes.js' },
  { name: 'admin', controller: 'AdminController.js', route: 'admin.js' },
  { name: 'dashboard', controller: 'DashboardController.js', route: 'dashboard.js' },
  { name: 'carrera', controller: null, route: 'carreras.js' },
  { name: 'habilidad', controller: null, route: 'habilidades.js' },
  { name: 'pregunta', controller: null, route: 'preguntas.js' }
];

modules.forEach(({ name, controller, route }) => {
  if (controller) {
    const newControllerName = `${name}.controller.js`;
    moveFile(`src/controllers/${controller}`, `src/modules/${name}/${newControllerName}`);
  }

  if (route) {
    const newRouteName = `${name}.routes.js`;
    moveFile(`src/routes/${route}`, `src/modules/${name}/${newRouteName}`);
  }
});

console.log('\n📋 PASO 7: Mover scripts\n');

// Mover scripts
if (fs.existsSync('scripts/createAdmin.js')) {
  moveFile('scripts/createAdmin.js', 'src/scripts/create-admin.js');
}
if (fs.existsSync('src/scripts/seedCarreras.js')) {
  moveFile('src/scripts/seedCarreras.js', 'src/database/seeders/carreras.seeder.js');
}
if (fs.existsSync('src/scripts/sedeers.js')) {
  moveFile('src/scripts/sedeers.js', 'src/database/seeders/initial.seeder.js');
}

console.log('\n📋 PASO 8: Mover config\n');

// Mover config
moveFile('src/config/database.js', 'src/config/database.config.js');

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  ✅ MIGRACIÓN COMPLETADA                                     ║
║                                                               ║
║  Siguiente paso:                                             ║
║  1. Revisar los archivos movidos                            ║
║  2. Ejecutar: node update-imports.js                        ║
║  3. Probar la aplicación                                    ║
║                                                               ║
║  ${DRY_RUN ? 'NOTA: Esto fue DRY RUN - ejecuta sin --dry-run' : ''}  ║
╚═══════════════════════════════════════════════════════════════╝
`);

if (DRY_RUN) {
  console.log('\n💡 Para ejecutar la migración real, corre:');
  console.log('   node migrate-structure.js\n');
}
