const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");
const bcrypt = require("bcrypt");

class Alumno extends Model {
  async checkPassword(password) {
    return await bcrypt.compare(password, this.contrasena);
  }
}

Alumno.init(
  {
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    correo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    fecha_ultimo_acceso: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    contrasena: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Alumno",
    tableName: "alumnos",
    hooks: {
      beforeCreate: async (alumno) => {
        alumno.contrasena = await bcrypt.hash(alumno.contrasena, 10);
      },
      beforeUpdate: async (alumno) => {
        if (alumno.changed("contrasena")) {
          alumno.contrasena = await bcrypt.hash(alumno.contrasena, 10);
        }
      },
    },
  }
);

module.exports = Alumno;
