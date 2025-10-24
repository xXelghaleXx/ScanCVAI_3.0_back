require("dotenv").config();
const { Alumno, sequelize } = require("../src/database/models");

/**
 * Script para eliminar usuarios de prueba de Cloudinary
 * Elimina usuarios con correos que contienen 'cloudinary' o 'test-cloudinary'
 */
async function deleteCloudinaryUsers() {
  try {
    console.log("🔍 Conectando a la base de datos...");
    console.log(`📊 DATABASE_URL: ${process.env.DATABASE_URL ? 'Configurado' : 'No configurado'}`);
    console.log(`📊 DB_HOST: ${process.env.DB_HOST || 'No configurado'}`);

    await sequelize.authenticate();
    console.log("✅ Conexión establecida");

    // Buscar usuarios con correos de cloudinary
    const cloudinaryUsers = await Alumno.findAll({
      where: {
        correo: {
          [sequelize.Sequelize.Op.or]: [
            { [sequelize.Sequelize.Op.like]: '%cloudinary%' },
            { [sequelize.Sequelize.Op.like]: '%test-%' }
          ]
        }
      },
      attributes: ['id', 'correo', 'nombre', 'apellido', 'estado', 'rol', 'createdAt']
    });

    if (cloudinaryUsers.length === 0) {
      console.log("ℹ️ No se encontraron usuarios de prueba de Cloudinary");
      await sequelize.close();
      return;
    }

    console.log(`\n📋 Se encontraron ${cloudinaryUsers.length} usuarios de prueba:\n`);
    cloudinaryUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.correo}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Nombre: ${user.nombre} ${user.apellido}`);
      console.log(`   Estado: ${user.estado} | Rol: ${user.rol}`);
      console.log(`   Creado: ${user.createdAt}`);
      console.log('');
    });

    // Eliminar usuarios
    console.log("🗑️ Eliminando usuarios de prueba...");
    const deletedCount = await Alumno.destroy({
      where: {
        correo: {
          [sequelize.Sequelize.Op.or]: [
            { [sequelize.Sequelize.Op.like]: '%cloudinary%' },
            { [sequelize.Sequelize.Op.like]: '%test-%' }
          ]
        }
      }
    });

    console.log(`✅ Se eliminaron ${deletedCount} usuarios de prueba exitosamente`);

    await sequelize.close();
    console.log("\n✅ Proceso completado");
  } catch (error) {
    console.error("❌ Error eliminando usuarios de prueba:", error);
    process.exit(1);
  }
}

// Ejecutar script
deleteCloudinaryUsers();
