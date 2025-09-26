const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const TipoHabilidad = sequelize.define("TipoHabilidad", {
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: "Ej: Técnica, Blanda"
  }
}, {
  sequelize,
  modelName: "TipoHabilidad",
  tableName: "tipos_habilidad",
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['nombre']
    }
  ]
});

module.exports = TipoHabilidad;