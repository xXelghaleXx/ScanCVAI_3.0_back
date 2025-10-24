/**
 * Script para crear un usuario administrador
 * Uso: node scripts/create-admin.js
 */

require('dotenv').config();
const { Alumno } = require('../src/database/models');
const sequelize = require('../src/config/database.config');

async function createAdmin() {
  try {
    console.log('🔧 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida correctamente');

    // Sincronizar modelos (crear tablas si no existen)
    await sequelize.sync();
    console.log('✅ Modelos sincronizados');

    // Datos del administrador
    const adminData = {
      nombre: 'Administrador',
      correo: 'admin@scancvai.com',
      contrasena: 'Admin123!', // Cambiar esta contraseña después
      rol: 'administrador',
      estado: 'activo',
      intentos_fallidos: 0
    };

    // Verificar si el admin ya existe
    const existingAdmin = await Alumno.findOne({
      where: { correo: adminData.correo }
    });

    if (existingAdmin) {
      console.log('⚠️  El usuario administrador ya existe');
      console.log('📧 Correo:', existingAdmin.correo);
      console.log('👤 Nombre:', existingAdmin.nombre);
      console.log('🔑 Rol:', existingAdmin.rol);

      // Opción para actualizar el rol si existe pero no es admin
      if (existingAdmin.rol !== 'administrador') {
        console.log('🔄 Actualizando rol a administrador...');
        existingAdmin.rol = 'administrador';
        await existingAdmin.save();
        console.log('✅ Rol actualizado correctamente');
      }
    } else {
      // Crear nuevo administrador
      console.log('🔨 Creando usuario administrador...');
      const admin = await Alumno.create(adminData);

      console.log('✅ Usuario administrador creado exitosamente!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 DATOS DE ACCESO:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Correo:', admin.correo);
      console.log('🔑 Contraseña:', adminData.contrasena);
      console.log('👤 Nombre:', admin.nombre);
      console.log('🎭 Rol:', admin.rol);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login');
    }

    await sequelize.close();
    console.log('🔒 Conexión cerrada');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error creando administrador:', error);
    await sequelize.close();
    process.exit(1);
  }
}

// Ejecutar función
createAdmin();
