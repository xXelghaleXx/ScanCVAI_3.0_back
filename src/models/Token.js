const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Token = sequelize.define("Token", {
  alumnoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  refreshToken: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Token;
