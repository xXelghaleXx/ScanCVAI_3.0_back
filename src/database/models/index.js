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

// Asociaciones de Alumno
Alumno.hasMany(CV, {
  foreignKey: 'alumnoId',
  as: 'cvs'
});

Alumno.hasMany(Entrevista, {
  foreignKey: 'alumnoId',
  as: 'entrevistas'
});

Alumno.hasMany(Token, {
  foreignKey: 'alumnoId',
  as: 'tokens'
});

// Asociaciones de CV
CV.belongsTo(Alumno, {
  foreignKey: 'alumnoId',
  as: 'alumno'
});

CV.hasMany(Informe, {
  foreignKey: 'cvId',
  as: 'informes'
});

// Asociaciones de Informe
Informe.belongsTo(CV, {
  foreignKey: 'cvId',
  as: 'cv'
});

// Asociaciones de Token
Token.belongsTo(Alumno, {
  foreignKey: 'alumnoId',
  as: 'alumno'
});

// Asociaciones de Entrevista
Entrevista.belongsTo(Alumno, {
  foreignKey: 'alumnoId',
  as: 'alumno'
});

Entrevista.belongsTo(Carrera, {
  foreignKey: 'carreraId',
  as: 'carrera'
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