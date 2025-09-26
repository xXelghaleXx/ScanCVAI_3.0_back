const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Informe = require("./Informe");
const Habilidad = require("./Habilidad");

const InformeHabilidades = sequelize.define("InformeHabilidades", {
  informeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Informe,
      key: 'id'
    }
  },
  habilidadId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Habilidad,
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: "InformeHabilidades",
  tableName: "informe_habilidades",
  timestamps: true
});

// Asociaciones
InformeHabilidades.belongsTo(Informe, {
  foreignKey: 'informeId',
  as: 'informe'
});

InformeHabilidades.belongsTo(Habilidad, {
  foreignKey: 'habilidadId',
  as: 'habilidad'
});

Informe.hasMany(InformeHabilidades, {
  foreignKey: 'informeId',
  as: 'habilidades'
});

Habilidad.hasMany(InformeHabilidades, {
  foreignKey: 'habilidadId',
  as: 'informe_habilidades'
});

module.exports = InformeHabilidades;