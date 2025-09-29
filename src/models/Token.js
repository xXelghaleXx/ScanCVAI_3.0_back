const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Alumno = require("./Alumno");

const Token = sequelize.define('Token', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
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
  modelName: 'Token',
  tableName: 'tokens',
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
  ]
});

// Asociaciones
Token.belongsTo(Alumno, {
  foreignKey: 'alumnoId',
  as: 'alumno'
});

Alumno.hasMany(Token, {
  foreignKey: 'alumnoId',
  as: 'tokens'
});

module.exports = Token;