// models/index.js
const sequelize = require("../config/database");

// Importar modelos en orden de dependencias
const Alumno = require("./Alumno");
const Token = require("./Token");
const TipoHabilidad = require("./TipoHabilidad");
const Habilidad = require("./Habilidad");
const CV = require("./CV");
const CVHabilidad = require("./CVHabilidad");
const Informe = require("./Informe");
const InformeFortalezas = require("./InformeFortalezas");
const InformeHabilidades = require("./InformeHabilidades");
const InformeAreasMejora = require("./InformeAreasMejora");
const PreguntaEntrevista = require("./PreguntaEntrevista");
const Entrevista = require("./Entrevista");
const RespuestaEntrevista = require("./RespuestaEntrevista");
const HistorialEntrevista = require("./HistorialEntrevista");

// ===== CONFIGURACIÓN DE ASOCIACIONES =====
// (Las asociaciones ya están definidas en cada modelo individual)

// Función para sincronizar todos los modelos
const syncModels = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log("✅ Todos los modelos sincronizados correctamente");
  } catch (error) {
    console.error("❌ Error sincronizando modelos:", error);
    throw error;
  }
};

// Exportar modelos y utilidades
module.exports = {
  sequelize,
  syncModels,
  
  // Modelos base
  Alumno,
  Token,
  
  // Modelos de habilidades
  TipoHabilidad,
  Habilidad,
  
  // Modelos de CV
  CV,
  CVHabilidad,
  
  // Modelos de informes
  Informe,
  InformeFortalezas,
  InformeHabilidades,
  InformeAreasMejora,
  
  // Modelos de entrevistas
  PreguntaEntrevista,
  Entrevista,
  RespuestaEntrevista,
  HistorialEntrevista
};