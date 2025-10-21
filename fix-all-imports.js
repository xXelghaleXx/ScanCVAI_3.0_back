/**
 * Script completo para arreglar TODOS los imports
 */

const fs = require('fs');
const path = require('path');

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Determinar la carpeta base para calcular rutas relativas
  const relativePath = path.relative('src', filePath).replace(/\\/g, '/');
  const depth = relativePath.split('/').length - 1;

  // Construir prefijo de ruta según profundidad
  const toRoot = '../'.repeat(depth);

  // Fix imports de models - siempre usar desde database/models
  const modelImportRegex = /require\(["']\.\.\/models\/(\w+)["']\)/g;
  if (modelImportRegex.test(content)) {
    content = content.replace(modelImportRegex, 'require("../../database/models").$1');
    modified = true;
  }

  // Fix imports directos de models individuales
  const singleModelRegex = /const (\w+) = require\(["']\.\.\/models\/\w+["']\)/g;
  const matches = [...content.matchAll(/const (\w+) = require\(["']\.\.\/models\/(\w+)["']\)/g)];
  if (matches.length > 0) {
    matches.forEach(match => {
      const varName = match[1];
      const modelName = match[2];
      content = content.replace(match[0], `const { ${varName} } = require("../../database/models")`);
    });
    modified = true;
  }

  // Guardar si hubo cambios
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${relativePath}`);
    return true;
  }
  return false;
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'logs', 'uploads'].includes(file)) {
        walkDir(filePath, callback);
      }
    } else if (file.endsWith('.js')) {
      callback(filePath);
    }
  });
}

console.log('🔧 Fixing all imports...\n');

let fixed = 0;
walkDir('src', (filePath) => {
  if (fixImportsInFile(filePath)) {
    fixed++;
  }
});

console.log(`\n✅ Fixed ${fixed} files`);
