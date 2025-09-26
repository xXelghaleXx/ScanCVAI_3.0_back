const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Alumno = require("./Alumno");

const Entrevista = sequelize.define("Entrevista", {
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  promedio_puntuacion: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: "Guardamos el promedio de puntuaciones"
  },
  resultado_final: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: "Guardamos la evaluación final"
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
  modelName: "Entrevista",
  tableName: "entrevistas",
  timestamps: false // Ya tenemos fecha manualmente
});

// Asociaciones
Entrevista.belongsTo(Alumno, {
  foreignKey: 'alumnoId',
  as: 'alumno'
});

Alumno.hasMany(Entrevista, {
  foreignKey: 'alumnoId',
  as: 'entrevistas'
});

module.exports = Entrevista;