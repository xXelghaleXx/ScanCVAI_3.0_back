/**
 * Script para listar todos los usuarios
 * Uso: node scripts/list-users.js
 */

require('dotenv').config();
const { Alumno } = require('../src/database/models');
const sequelize = require('../src/config/database.config');

async function listUsers() {
  try {
    console.log('🔧 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida correctamente\n');

    const usuarios = await Alumno.findAll({
      attributes: ['id', 'nombre', 'correo', 'rol', 'estado', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    if (usuarios.length === 0) {
      console.log('⚠️  No hay usuarios en la base de datos');
    } else {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📋 USUARIOS REGISTRADOS (${usuarios.length} total)`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      usuarios.forEach((usuario, index) => {
        const rolEmoji = usuario.rol === 'administrador' ? '👑' : '👤';
        console.log(`${index + 1}. ${rolEmoji} ${usuario.nombre}`);
        console.log(`   📧 ${usuario.correo}`);
        console.log(`   🎭 Rol: ${usuario.rol}`);
        console.log(`   📊 Estado: ${usuario.estado}`);
        console.log(`   📅 Creado: ${usuario.createdAt.toLocaleString()}`);
        console.log('');
      });

      const admins = usuarios.filter(u => u.rol === 'administrador');
      const alumnos = usuarios.filter(u => u.rol === 'alumno');

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📊 Resumen: ${admins.length} administradores, ${alumnos.length} alumnos`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    await sequelize.close();
    console.log('\n🔒 Conexión cerrada');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error listando usuarios:', error);
    await sequelize.close();
    process.exit(1);
  }
}

// Ejecutar función
listUsers();
