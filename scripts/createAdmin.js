/**
 * Script para crear un usuario administrador
 *
 * Uso:
 * node scripts/createAdmin.js <nombre> <correo> <contraseña>
 *
 * Ejemplo:
 * node scripts/createAdmin.js "Admin Principal" admin@example.com Admin123!
 */

require('dotenv').config();
const { Alumno } = require('../src/models');

async function createAdmin() {
  try {
    // Obtener argumentos de línea de comandos
    const args = process.argv.slice(2);

    if (args.length < 3) {
      console.error('❌ Error: Faltan argumentos');
      console.log('\nUso: node scripts/createAdmin.js <nombre> <correo> <contraseña>');
      console.log('Ejemplo: node scripts/createAdmin.js "Admin Principal" admin@example.com Admin123!\n');
      process.exit(1);
    }

    const [nombre, correo, contrasena] = args;

    // Validaciones básicas
    if (!nombre || nombre.length < 2) {
      console.error('❌ El nombre debe tener al menos 2 caracteres');
      process.exit(1);
    }

    if (!correo.includes('@')) {
      console.error('❌ El correo no es válido');
      process.exit(1);
    }

    if (!contrasena || contrasena.length < 6) {
      console.error('❌ La contraseña debe tener al menos 6 caracteres');
      process.exit(1);
    }

    console.log('🔍 Verificando si el usuario ya existe...');

    // Verificar si el usuario ya existe
    const existingUser = await Alumno.findOne({ where: { correo } });

    if (existingUser) {
      if (existingUser.rol === 'administrador') {
        console.log('ℹ️ El usuario ya existe y es administrador');
        console.log(`\n📋 Información del administrador:`);
        console.log(`   ID: ${existingUser.id}`);
        console.log(`   Nombre: ${existingUser.nombre}`);
        console.log(`   Correo: ${existingUser.correo}`);
        console.log(`   Estado: ${existingUser.estado}`);
        process.exit(0);
      } else {
        console.log('🔄 El usuario existe pero no es administrador. Actualizando rol...');
        existingUser.rol = 'administrador';
        await existingUser.save();

        console.log('✅ Usuario actualizado a administrador exitosamente');
        console.log(`\n📋 Información del administrador:`);
        console.log(`   ID: ${existingUser.id}`);
        console.log(`   Nombre: ${existingUser.nombre}`);
        console.log(`   Correo: ${existingUser.correo}`);
        console.log(`   Estado: ${existingUser.estado}`);
        console.log(`   Rol: ${existingUser.rol}`);
        process.exit(0);
      }
    }

    console.log('➕ Creando nuevo usuario administrador...');

    // Crear nuevo usuario administrador
    const admin = await Alumno.create({
      nombre,
      correo,
      contrasena,
      rol: 'administrador',
      estado: 'activo',
      intentos_fallidos: 0
    });

    console.log('✅ Usuario administrador creado exitosamente\n');
    console.log('📋 Información del administrador:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Nombre: ${admin.nombre}`);
    console.log(`   Correo: ${admin.correo}`);
    console.log(`   Rol: ${admin.rol}`);
    console.log(`   Estado: ${admin.estado}`);

    console.log('\n🔐 Credenciales de acceso:');
    console.log(`   Correo: ${correo}`);
    console.log(`   Contraseña: ${contrasena}`);

    console.log('\n💡 Puedes acceder al panel de administrador en: /admin');

  } catch (error) {
    console.error('❌ Error creando administrador:', error.message);
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`   - ${err.message}`);
      });
    }
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Ejecutar script
createAdmin();
