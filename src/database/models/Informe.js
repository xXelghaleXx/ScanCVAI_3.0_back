const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database.config");
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
  },
  pdf_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL del informe PDF guardado en Cloudinary'
  },
  pdf_public_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Public ID de Cloudinary para el PDF'
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