'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Agregar columna 'rol' a la tabla alumnos
    await queryInterface.addColumn('alumnos', 'rol', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'alumno',
      after: 'intentos_fallidos' // Opcional, para ordenar después de intentos_fallidos
    });

    // Agregar constraint para validar valores
    await queryInterface.sequelize.query(`
      ALTER TABLE alumnos
      ADD CONSTRAINT alumnos_rol_check
      CHECK (rol IN ('alumno', 'administrador'));
    `);

    console.log('✅ Columna "rol" agregada exitosamente a la tabla alumnos');
  },

  async down(queryInterface, Sequelize) {
    // Eliminar constraint primero
    await queryInterface.sequelize.query(`
      ALTER TABLE alumnos DROP CONSTRAINT IF EXISTS alumnos_rol_check;
    `);

    // Eliminar columna
    await queryInterface.removeColumn('alumnos', 'rol');

    console.log('✅ Columna "rol" eliminada de la tabla alumnos');
  }
};
