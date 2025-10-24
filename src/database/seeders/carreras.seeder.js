const { syncModels, Carrera } = require("../models");

async function seedCarreras() {
  try {
    console.log("Iniciando seeding...");
    await syncModels({ alter: true });

    const carreras = [
      { nombre: "Mecatrónica Industrial", area: "Electrónica y Electricidad", duracion_anios: 3, descripcion: "Integración de sistemas", competencias_clave: ["Robótica", "Automatización"] },
      { nombre: "Diseño y Desarrollo de Software", area: "Tecnología Digital", duracion_anios: 3, descripcion: "Desarrollo de aplicaciones", competencias_clave: ["Programación", "Web"] },
      { nombre: "Ciberseguridad y Auditoría Informática", area: "Tecnología Digital", duracion_anios: 3, descripcion: "Seguridad informática", competencias_clave: ["Ethical hacking"] },
      { nombre: "Big Data y Ciencia de Datos", area: "Tecnología Digital", duracion_anios: 3, descripcion: "Análisis de datos", competencias_clave: ["Python", "ML"] }
    ];

    for (const c of carreras) {
      await Carrera.findOrCreate({ where: { nombre: c.nombre }, defaults: c });
    }

    console.log("✅ Carreras creadas:", carreras.length);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

seedCarreras();