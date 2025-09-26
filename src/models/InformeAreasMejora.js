const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Informe = require("./Informe");

const InformeAreasMejora = sequelize.define("InformeAreasMejora", {
  area_mejora: {
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
  modelName: "InformeAreasMejora",
  tableName: "informe_areas_mejora",
  timestamps: true
});

// Asociaciones
InformeAreasMejora.belongsTo(Informe, {
  foreignKey: 'informeId',
  as: 'informe'
});

Informe.hasMany(InformeAreasMejora, {
  foreignKey: 'informeId',
  as: 'areas_mejora'
});

module.exports = InformeAreasMejora;