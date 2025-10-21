/**
 * Script de Limpieza de Estructura Antigua
 *
 * Elimina las carpetas y archivos antiguos después de confirmar
 * que la nueva estructura funciona correctamente.
 *
 * IMPORTANTE: Ejecutar SOLO después de verificar que todo funciona
 *
 * Uso: node cleanup-old-structure.js
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  🧹 LIMPIEZA DE ESTRUCTURA ANTIGUA                           ║
║                                                               ║
║  Modo: ${DRY_RUN ? 'DRY RUN (solo mostrar cambios)' : 'EJECUCIÓN REAL'}                    ║
║                                                               ║
║  ⚠️  ADVERTENCIA: Esto eliminará carpetas antiguas          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

// Función para eliminar directorio recursivamente
function removeDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`⏭️  Ya eliminado: ${dirPath}`);
    return;
  }

  if (!DRY_RUN) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  console.log(`🗑️  Eliminar: ${dirPath}`);
}

// Función para eliminar archivo
function removeFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Ya eliminado: ${filePath}`);
    return;
  }

  if (!DRY_RUN) {
    fs.unlinkSync(filePath);
  }
  console.log(`🗑️  Eliminar: ${filePath}`);
}

console.log('\n📋 PASO 1: Eliminar carpetas antiguas\n');

// Carpetas antiguas a eliminar
const oldDirs = [
  'src/models',           // Movido a src/database/models
  'src/controllers',      // Movido a src/modules/*/
  'src/routes',           // Movido a src/modules/*/
  'src/middlewares',      // Movido a src/shared/middlewares
  'src/services',         // Movido a src/shared/services
  'src/scripts',          // Los seeders movidos a src/database/seeders
  'models',               // Duplicado en raíz
  'migrations',           // Movido a src/database/migrations
  'scripts'               // Movido a src/scripts
];

oldDirs.forEach(dir => removeDir(dir));

console.log('\n📋 PASO 2: Eliminar archivos de configuración antigua\n');

// Archivos antiguos (si existen)
const oldFiles = [
  'src/config/database.js'  // Renombrado a database.config.js
];

oldFiles.forEach(file => {
  if (fs.existsSync(file) && fs.existsSync(file.replace('.js', '.config.js'))) {
    removeFile(file);
  }
});

console.log('\n📋 PASO 3: Mantener archivos esenciales\n');

const essentialFiles = [
  'migrate-structure.js',
  'update-imports.js',
  'cleanup-old-structure.js',
  '.structure-migration-plan.md'
];

console.log('✅ Archivos de migración conservados:');
essentialFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   📄 ${file}`);
  }
});

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  ✅ LIMPIEZA COMPLETADA                                      ║
║                                                               ║
║  ${DRY_RUN ? 'NOTA: Esto fue DRY RUN - ejecuta sin --dry-run' : 'Estructura antigua eliminada correctamente'}  ║
║                                                               ║
║  Puedes eliminar manualmente estos archivos de migración:   ║
║  - migrate-structure.js                                      ║
║  - update-imports.js                                         ║
║  - cleanup-old-structure.js                                  ║
║  - .structure-migration-plan.md                              ║
╚═══════════════════════════════════════════════════════════════╝
`);

if (DRY_RUN) {
  console.log('\n💡 Para ejecutar la limpieza real, corre:');
  console.log('   node cleanup-old-structure.js\n');
} else {
  console.log('\n🎉 ¡Nueva estructura lista para usar!\n');
}
