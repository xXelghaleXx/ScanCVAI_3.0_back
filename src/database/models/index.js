const sequelize = require("../../config/database.config");

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
const Carrera = require("./Carrera");
const PreguntaEntrevista = require("./PreguntaEntrevista");
const Entrevista = require("./Entrevista");
const RespuestaEntrevista = require("./RespuestaEntrevista");
const HistorialEntrevista = require("./HistorialEntrevista");

// ===== ASOCIACIONES =====
// NOTA: Las siguientes asociaciones YA están definidas en sus archivos de modelo:
// - CV ↔ Alumno (en CV.js)
// - Informe ↔ CV (en Informe.js)
// - Token ↔ Alumno (en Token.js)
// - CVHabilidad ↔ CV y Habilidad (en CVHabilidad.js)
// - Habilidad ↔ TipoHabilidad (en Habilidad.js)
// - InformeFortalezas/Habilidades/AreasMejora ↔ Informe (en sus archivos respectivos)

// Asociaciones de Entrevista
Entrevista.belongsTo(Alumno, {
  foreignKey: 'alumnoId',
  as: 'alumno'
});

Entrevista.belongsTo(Carrera, {
  foreignKey: 'carreraId',
  as: 'carrera'
});

Alumno.hasMany(Entrevista, {
  foreignKey: 'alumnoId',
  as: 'entrevistas'
});

Carrera.hasMany(Entrevista, {
  foreignKey: 'carreraId',
  as: 'entrevistas'
});

// Asociaciones de RespuestaEntrevista
RespuestaEntrevista.belongsTo(Entrevista, {
  foreignKey: 'entrevistaId',
  as: 'entrevista'
});

RespuestaEntrevista.belongsTo(PreguntaEntrevista, {
  foreignKey: 'preguntaId',
  as: 'pregunta'
});

Entrevista.hasMany(RespuestaEntrevista, {
  foreignKey: 'entrevistaId',
  as: 'respuestas'
});

PreguntaEntrevista.hasMany(RespuestaEntrevista, {
  foreignKey: 'preguntaId',
  as: 'respuestas'
});

// Asociaciones de HistorialEntrevista
HistorialEntrevista.belongsTo(Entrevista, {
  foreignKey: 'entrevistaId',
  as: 'entrevista'
});

Entrevista.hasMany(HistorialEntrevista, {
  foreignKey: 'entrevistaId',
  as: 'historial'
});

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
  
  // Modelos de carreras y entrevistas
  Carrera,
  PreguntaEntrevista,
  Entrevista,
  RespuestaEntrevista,
  HistorialEntrevista
};