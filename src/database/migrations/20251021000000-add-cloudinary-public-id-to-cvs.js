'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Agregar columna 'cloudinary_public_id' a la tabla cvs
    await queryInterface.addColumn('cvs', 'cloudinary_public_id', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Public ID de Cloudinary para gestión del archivo'
    });

    // Actualizar el comentario de la columna archivo
    await queryInterface.changeColumn('cvs', 'archivo', {
      type: Sequelize.STRING,
      allowNull: false,
      comment: 'URL de Cloudinary o ruta local del archivo CV'
    });

    console.log('✅ Columna "cloudinary_public_id" agregada exitosamente a la tabla cvs');
  },

  async down(queryInterface, Sequelize) {
    // Eliminar columna
    await queryInterface.removeColumn('cvs', 'cloudinary_public_id');

    // Revertir comentario de archivo
    await queryInterface.changeColumn('cvs', 'archivo', {
      type: Sequelize.STRING,
      allowNull: false,
      comment: 'Ruta del archivo CV (se almacenará en /uploads/cvs/)'
    });

    console.log('✅ Columna "cloudinary_public_id" eliminada de la tabla cvs');
  }
};
