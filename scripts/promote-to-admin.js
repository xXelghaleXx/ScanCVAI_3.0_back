/**
 * Script para promover usuarios existentes a administrador
 * Uso: node scripts/promote-to-admin.js correo@ejemplo.com
 */

require('dotenv').config();
const { Alumno } = require('../src/database/models');
const sequelize = require('../src/config/database.config');

async function promoteToAdmin() {
  try {
    // Obtener el correo desde los argumentos de línea de comandos
    const correo = process.argv[2];

    if (!correo) {
      console.error('❌ Error: Debes proporcionar un correo electrónico');
      console.log('📝 Uso: node scripts/promote-to-admin.js correo@ejemplo.com');
      process.exit(1);
    }

    console.log('🔧 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida correctamente');

    // Buscar el usuario por correo
    const usuario = await Alumno.findOne({ where: { correo } });

    if (!usuario) {
      console.error(`❌ No se encontró ningún usuario con el correo: ${correo}`);
      await sequelize.close();
      process.exit(1);
    }

    // Verificar si ya es administrador
    if (usuario.rol === 'administrador') {
      console.log(`⚠️  El usuario ${usuario.nombre} (${correo}) ya es administrador`);
      await sequelize.close();
      process.exit(0);
    }

    // Promover a administrador
    usuario.rol = 'administrador';
    await usuario.save();

    console.log('✅ Usuario promovido a administrador exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 INFORMACIÓN DEL USUARIO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Nombre:', usuario.nombre);
    console.log('📧 Correo:', usuario.correo);
    console.log('🎭 Rol anterior: alumno');
    console.log('🎭 Rol nuevo: administrador');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await sequelize.close();
    console.log('🔒 Conexión cerrada');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error promoviendo usuario:', error);
    await sequelize.close();
    process.exit(1);
  }
}

// Ejecutar función
promoteToAdmin();
