const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Entrevista = require("./Entrevista");

const HistorialEntrevista = sequelize.define("HistorialEntrevista", {
  resultado: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  entrevistaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Entrevista,
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: "HistorialEntrevista",
  tableName: "historial_entrevistas",
  timestamps: false // Ya tenemos fecha manualmente
});

// Asociaciones
HistorialEntrevista.belongsTo(Entrevista, {
  foreignKey: 'entrevistaId',
  as: 'entrevista'
});

Entrevista.hasMany(HistorialEntrevista, {
  foreignKey: 'entrevistaId',
  as: 'historial'
});

module.exports = HistorialEntrevista;