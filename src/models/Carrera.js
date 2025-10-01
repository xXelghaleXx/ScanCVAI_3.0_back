const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Carrera = sequelize.define("Carrera", {
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: "Ej: Desarrollo de Software, Electrónica Industrial"
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Descripción breve de la carrera"
  },
  area: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: "Departamento: Electrónica y Electricidad, Gestión y Producción, etc."
  },
  duracion_anios: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
    comment: "Duración de la carrera: 2 o 3 años"
  },
  competencias_clave: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Array de competencias principales: ['programación', 'algoritmos']"
  }
}, {
  sequelize,
  modelName: "Carrera",
  tableName: "carreras",
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['nombre'],
      name: 'carreras_nombre_unique'
    },
    {
      fields: ['area'],
      name: 'carreras_area_index'
    },
    {
      fields: ['duracion_anios'],
      name: 'carreras_duracion_index'
    }
  ]
});

module.exports = Carrera;