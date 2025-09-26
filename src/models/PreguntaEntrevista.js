const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PreguntaEntrevista = sequelize.define("PreguntaEntrevista", {
  texto: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true
  }
}, {
  sequelize,
  modelName: "PreguntaEntrevista",
  tableName: "preguntas_entrevista",
  timestamps: true
});

module.exports = PreguntaEntrevista;