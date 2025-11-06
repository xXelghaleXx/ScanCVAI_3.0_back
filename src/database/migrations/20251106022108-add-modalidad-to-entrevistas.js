'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('entrevistas', 'modalidad', {
      type: Sequelize.ENUM('chat', 'voz'),
      allowNull: false,
      defaultValue: 'chat',
      comment: 'Modalidad de la entrevista: chat o voz'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('entrevistas', 'modalidad');
    // Eliminar el ENUM type si es necesario (PostgreSQL)
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_entrevistas_modalidad";');
  }
};
