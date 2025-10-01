const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

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
    allowNull: false
  }
}, {
  sequelize,
  modelName: "HistorialEntrevista",
  tableName: "historial_entrevistas",
  timestamps: false
});

module.exports = HistorialEntrevista;