const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Alumno = require("./Alumno");

const CV = sequelize.define("CV", {
  archivo: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Ruta del archivo CV (se almacenará en /uploads/cvs/)"
  },
  contenido_extraido: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Texto extraído con IA"
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  alumnoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Alumno,
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: "CV",
  tableName: "cvs",
  timestamps: false // Ya tenemos fecha_creacion manualmente
});

// Asociaciones
CV.belongsTo(Alumno, {
  foreignKey: 'alumnoId',
  as: 'alumno'
});

Alumno.hasMany(CV, {
  foreignKey: 'alumnoId',
  as: 'cvs'
});

module.exports = CV;