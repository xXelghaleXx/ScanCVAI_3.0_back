const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Entrevista = sequelize.define("Entrevista", {
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  promedio_puntuacion: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: "Promedio final de la entrevista"
  },
  resultado_final: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: "Evaluación final: Excelente, Bueno, Regular, etc."
  },
  dificultad: {
    type: DataTypes.ENUM('basica', 'intermedia', 'avanzada'),
    allowNull: false,
    defaultValue: 'intermedia'
  },
  estado: {
    type: DataTypes.ENUM('iniciada', 'en_progreso', 'completada', 'abandonada'),
    allowNull: false,
    defaultValue: 'iniciada'
  },
  historial_conversacion: {
    type: DataTypes.JSON,
    allowNull: true
  },
  evaluacion_final_ia: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fortalezas_detectadas: {
    type: DataTypes.JSON,
    allowNull: true
  },
  areas_mejora_detectadas: {
    type: DataTypes.JSON,
    allowNull: true
  },
  duracion_minutos: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  alumnoId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  carreraId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  sequelize,
  modelName: "Entrevista",
  tableName: "entrevistas",
  timestamps: true
});

module.exports = Entrevista;