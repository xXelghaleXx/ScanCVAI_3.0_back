const { Sequelize } = require("sequelize");
require("dotenv").config();

// Priorizar DATABASE_URL (Render) sobre variables individuales
let sequelize;

if (process.env.DATABASE_URL) {
  // Usar DATABASE_URL para Render/Heroku/Clever Cloud
  // Clever Cloud siempre requiere SSL
  const isCleverCloud = process.env.DATABASE_URL.includes('clever-cloud.com');

  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: false, // Desactivar logging en producción
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: (process.env.NODE_ENV === "production" || isCleverCloud) ? {
        require: true,
        rejectUnauthorized: false
      } : false,
      connectTimeout: 60000
    }
  });
} else {
  // Usar variables individuales para desarrollo local
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: "postgres",
      logging: false,
    }
  );
}

module.exports = sequelize;
