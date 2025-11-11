'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('informes', 'pdf_url', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'URL del informe PDF guardado en Cloudinary'
    });

    await queryInterface.addColumn('informes', 'pdf_public_id', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Public ID de Cloudinary para el PDF'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('informes', 'pdf_url');
    await queryInterface.removeColumn('informes', 'pdf_public_id');
  }
};
