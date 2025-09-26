const { syncModels, TipoHabilidad, PreguntaEntrevista, Habilidad } = require("../src/models");

async function seedDatabase() {
  try {
    console.log("🌱 Iniciando seeding de base de datos...");

    // Sincronizar modelos primero
    await syncModels({ alter: true });

    // 1. Crear tipos de habilidades
    const tiposHabilidad = await TipoHabilidad.bulkCreate([
      { nombre: "Técnica" },
      { nombre: "Blanda" }
    ], { ignoreDuplicates: true });

    console.log("✅ Tipos de habilidad creados");

    // 2. Crear habilidades predefinidas
    const tipoTecnica = await TipoHabilidad.findOne({ where: { nombre: "Técnica" } });
    const tipoBlanda = await TipoHabilidad.findOne({ where: { nombre: "Blanda" } });

    const habilidadesTecnicas = [
      "JavaScript", "Python", "React", "Node.js", "SQL", "HTML", "CSS",
      "Git", "Docker", "MongoDB", "PostgreSQL", "AWS", "Linux", "Java",
      "TypeScript", "Vue.js", "Angular", "Express.js", "REST APIs"
    ];

    const habilidadesBlandas = [
      "Comunicación", "Trabajo en equipo", "Liderazgo", "Resolución de problemas",
      "Adaptabilidad", "Creatividad", "Pensamiento crítico", "Gestión del tiempo",
      "Orientación a resultados", "Iniciativa", "Empatía", "Negociación",
      "Presentaciones", "Mentoring", "Planificación"
    ];

    // Insertar habilidades técnicas
    for (const habilidad of habilidadesTecnicas) {
      await Habilidad.findOrCreate({
        where: { habilidad, tipoId: tipoTecnica.id }
      });
    }

    // Insertar habilidades blandas
    for (const habilidad of habilidadesBlandas) {
      await Habilidad.findOrCreate({
        where: { habilidad, tipoId: tipoBlanda.id }
      });
    }

    console.log("✅ Habilidades predefinidas creadas");

    // 3. Crear preguntas de entrevista
    const preguntas = [
      "Cuéntame sobre ti y tu experiencia profesional.",
      "¿Por qué estás interesado en esta posición?",
      "Describe un desafío difícil que hayas enfrentado en el trabajo y cómo lo resolviste.",
      "¿Cuáles son tus principales fortalezas?",
      "¿Cuál consideras que es tu mayor área de mejora?",
      "¿Cómo manejas el trabajo bajo presión?",
      "Describe una situación donde tuviste que trabajar en equipo.",
      "¿Dónde te ves en 5 años?",
      "¿Por qué deberíamos contratarte?",
      "¿Tienes alguna pregunta para nosotros?",
      "Describe un proyecto del que te sientas especialmente orgulloso.",
      "¿Cómo te mantienes actualizado en tu campo profesional?",
      "Cuéntame sobre una vez que tuviste que aprender algo nuevo rápidamente.",
      "¿Cómo manejas los conflictos en el trabajo?",
      "¿Qué te motiva en tu trabajo diario?"
    ];

    for (const texto of preguntas) {
      await PreguntaEntrevista.findOrCreate({
        where: { texto }
      });
    }

    console.log("✅ Preguntas de entrevista creadas");
    console.log("🎉 Seeding completado exitosamente");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error en seeding:", error);
    process.exit(1);
  }
}

seedDatabase();