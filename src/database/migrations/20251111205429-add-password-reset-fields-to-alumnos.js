'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('alumnos', 'reset_password_token', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Token para recuperación de contraseña'
    });

    await queryInterface.addColumn('alumnos', 'reset_password_expires', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Fecha de expiración del token de recuperación'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('alumnos', 'reset_password_token');
    await queryInterface.removeColumn('alumnos', 'reset_password_expires');
  }
};
