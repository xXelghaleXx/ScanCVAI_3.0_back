const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const TipoHabilidad = require("./TipoHabilidad");

const Habilidad = sequelize.define("Habilidad", {
  habilidad: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  tipoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: TipoHabilidad,
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: "Habilidad",
  tableName: "habilidades",
  timestamps: true
});

// Asociaciones
Habilidad.belongsTo(TipoHabilidad, {
  foreignKey: 'tipoId',
  as: 'tipo'
});

TipoHabilidad.hasMany(Habilidad, {
  foreignKey: 'tipoId',
  as: 'habilidades'
});

module.exports = Habilidad;