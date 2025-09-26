const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const CV = require("./CV");
const Habilidad = require("./Habilidad");

const CVHabilidad = sequelize.define("CVHabilidad", {
  cvId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: CV,
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
  modelName: "CVHabilidad",
  tableName: "cv_habilidades",
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['cvId', 'habilidadId'],
      name: 'unique_cv_habilidad'
    }
  ]
});

// Asociaciones Many-to-Many
CV.belongsToMany(Habilidad, {
  through: CVHabilidad,
  foreignKey: 'cvId',
  otherKey: 'habilidadId',
  as: 'habilidades'
});

Habilidad.belongsToMany(CV, {
  through: CVHabilidad,
  foreignKey: 'habilidadId',
  otherKey: 'cvId',
  as: 'cvs'
});

// Asociaciones directas para acceder a la tabla intermedia
CVHabilidad.belongsTo(CV, {
  foreignKey: 'cvId',
  as: 'cv'
});

CVHabilidad.belongsTo(Habilidad, {
  foreignKey: 'habilidadId',
  as: 'habilidad'
});

CV.hasMany(CVHabilidad, {
  foreignKey: 'cvId',
  as: 'cv_habilidades'
});

Habilidad.hasMany(CVHabilidad, {
  foreignKey: 'habilidadId',
  as: 'cv_habilidades'
});

module.exports = CVHabilidad;