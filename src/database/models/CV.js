const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database.config");
const Alumno = require("./Alumno");

const CV = sequelize.define("CV", {
  archivo: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "URL de Cloudinary o ruta local del archivo CV"
  },
  cloudinary_public_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Public ID de Cloudinary para gestión del archivo"
  },
  file_extension: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: "Extensión del archivo original (.pdf, .docx, .doc)"
  },
  contenido_extraido: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Texto extraído con IA"
  },
  analisis_ia: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Análisis completo generado por la IA (fortalezas, habilidades, educación, experiencia, etc.)"
  },
  scoring_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Datos completos del scoring (puntuación final, métricas, nivel CV, etc.)"
  },
  rubrica_evaluation: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Evaluación completa basada en la rúbrica oficial (criterios, puntuación, nivel desempeño)"
  },
  validation_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Datos de validación del CV (score, campos requeridos, warnings)"
  },
  stats_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Estadísticas del CV (palabras, líneas, secciones detectadas)"
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