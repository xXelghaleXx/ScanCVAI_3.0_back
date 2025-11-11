'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('cvs', 'analisis_ia', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Análisis completo generado por la IA (fortalezas, habilidades, educación, experiencia, etc.)'
    });

    await queryInterface.addColumn('cvs', 'scoring_data', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Datos completos del scoring (puntuación final, métricas, nivel CV, etc.)'
    });

    await queryInterface.addColumn('cvs', 'rubrica_evaluation', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Evaluación completa basada en la rúbrica oficial (criterios, puntuación, nivel desempeño)'
    });

    await queryInterface.addColumn('cvs', 'validation_data', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Datos de validación del CV (score, campos requeridos, warnings)'
    });

    await queryInterface.addColumn('cvs', 'stats_data', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Estadísticas del CV (palabras, líneas, secciones detectadas)'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('cvs', 'analisis_ia');
    await queryInterface.removeColumn('cvs', 'scoring_data');
    await queryInterface.removeColumn('cvs', 'rubrica_evaluation');
    await queryInterface.removeColumn('cvs', 'validation_data');
    await queryInterface.removeColumn('cvs', 'stats_data');
  }
};
