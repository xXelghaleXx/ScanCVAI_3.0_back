const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const RespuestaEntrevista = sequelize.define("RespuestaEntrevista", {
  respuesta: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  retroalimentacion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  puntuacion: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  entrevistaId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  preguntaId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  sequelize,
  modelName: "RespuestaEntrevista",
  tableName: "respuestas_entrevista",
  timestamps: true
});

module.exports = RespuestaEntrevista;