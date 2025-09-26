const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Informe = require("./Informe");

const InformeFortalezas = sequelize.define("InformeFortalezas", {
  fortaleza: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  informeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Informe,
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: "InformeFortalezas",
  tableName: "informe_fortalezas",
  timestamps: true
});

// Asociaciones
InformeFortalezas.belongsTo(Informe, {
  foreignKey: 'informeId',
  as: 'informe'
});

Informe.hasMany(InformeFortalezas, {
  foreignKey: 'informeId',
  as: 'fortalezas'
});

module.exports = InformeFortalezas;