const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const CV = require("./CV");

const Informe = sequelize.define("Informe", {
  resumen: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  fecha_generacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  cvId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: CV,
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: "Informe",
  tableName: "informes",
  timestamps: false // Ya tenemos fecha_generacion manualmente
});

// Asociaciones
Informe.belongsTo(CV, {
  foreignKey: 'cvId',
  as: 'cv'
});

CV.hasMany(Informe, {
  foreignKey: 'cvId',
  as: 'informes'
});

module.exports = Informe;