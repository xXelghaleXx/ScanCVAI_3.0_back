const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

module.exports = (sequelize) => {
  const Token = sequelize.define('Token', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW // Agregar valor por defecto
    },
  isRevoked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  deviceInfo: {
    type: DataTypes.JSON,
    allowNull: true
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  createdByIp: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['refreshToken']
    },
    {
      fields: ['alumnoId']
    },
    {
      fields: ['expiresAt']
    }
  ],
  hooks: {
    beforeCreate: (token) => {
      if (!token.expiresAt) {
        // Por defecto, expira en 7 días
        token.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
    }
  }
});

module.exports = Token;

  return Token;
};