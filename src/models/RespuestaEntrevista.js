const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Entrevista = require("./Entrevista");
const PreguntaEntrevista = require("./PreguntaEntrevista");

const RespuestaEntrevista = sequelize.define("RespuestaEntrevista", {
  respuesta: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  retroalimentacion: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Se llenará con IA"
  },
  puntuacion: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Nueva puntuación"
  },
  entrevistaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Entrevista,
      key: 'id'
    }
  },
  preguntaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: PreguntaEntrevista,
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: "RespuestaEntrevista",
  tableName: "respuestas_entrevista",
  timestamps: true
});

// Asociaciones
RespuestaEntrevista.belongsTo(Entrevista, {
  foreignKey: 'entrevistaId',
  as: 'entrevista'
});

RespuestaEntrevista.belongsTo(PreguntaEntrevista, {
  foreignKey: 'preguntaId',
  as: 'pregunta'
});

Entrevista.hasMany(RespuestaEntrevista, {
  foreignKey: 'entrevistaId',
  as: 'respuestas'
});

PreguntaEntrevista.hasMany(RespuestaEntrevista, {
  foreignKey: 'preguntaId',
  as: 'respuestas'
});

module.exports = RespuestaEntrevista;