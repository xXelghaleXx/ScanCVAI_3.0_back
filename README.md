# 🎓 ScanCVAI 3.0 - Backend

Sistema profesional de análisis de CVs y entrevistas con IA para preparación laboral de estudiantes.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [API Documentation](#api-documentation)
- [Scripts Disponibles](#scripts-disponibles)

## ✨ Características

- 🤖 **Análisis de CV con IA**: Extracción inteligente de información usando Llama 3.1
- 💬 **Entrevistas Simuladas**: Sistema de entrevistas interactivas con IA
- 📊 **Dashboard Analítico**: Visualización de estadísticas y progreso
- 📄 **Generación de Informes PDF**: Reportes profesionales automáticos
- 🔐 **Autenticación Completa**: Login tradicional + Google OAuth
- 👨‍💼 **Panel de Administración**: Gestión de usuarios y sistema
- 🛡️ **Seguridad Avanzada**: Rate limiting, sanitización, monitoreo

## 🚀 Tecnologías

- **Runtime**: Node.js 16+
- **Framework**: Express 5.x
- **Base de Datos**: PostgreSQL + Sequelize ORM
- **IA**: Llama 3.1 (local)
- **Autenticación**: JWT + Google OAuth
- **Procesamiento**: Mammoth (DOCX), PDF-Parse
- **Testing**: (pendiente)

## 📁 Estructura del Proyecto

\`\`\`
backend-alumnos/
├── src/
│   ├── config/                    # Configuraciones centralizadas
│   │   ├── database.config.js
│   │   ├── jwt.config.js
│   │   ├── cors.config.js
│   │   └── constants.js
│   │
│   ├── database/                  # Todo lo relacionado con BD
│   │   ├── models/               # Modelos de Sequelize
│   │   ├── migrations/           # Migraciones de BD
│   │   └── seeders/              # Datos iniciales
│   │
│   ├── modules/                   # Arquitectura modular por dominio
│   │   ├── auth/                 # Autenticación y autorización
│   │   ├── cv/                   # Gestión de CVs
│   │   ├── entrevista/           # Sistema de entrevistas
│   │   ├── informe/              # Generación de informes
│   │   ├── admin/                # Panel administrativo
│   │   ├── dashboard/            # Analytics y dashboard
│   │   ├── carrera/              # Gestión de carreras
│   │   ├── habilidad/            # Gestión de habilidades
│   │   └── pregunta/             # Banco de preguntas
│   │
│   ├── shared/                    # Recursos compartidos
│   │   ├── middlewares/          # Middlewares reutilizables
│   │   ├── services/             # Servicios comunes
│   │   └── utils/                # Utilidades
│   │
│   ├── scripts/                   # Scripts de mantenimiento
│   │
│   ├── app.js                     # Configuración de Express
│   └── server.js                  # Punto de entrada
│
├── logs/                          # Logs de la aplicación
├── uploads/                       # Archivos subidos
├── tests/                         # Tests (pendiente)
├── .env.example                   # Template de variables
├── .sequelizerc                   # Config de Sequelize CLI
└── package.json
\`\`\`

### 🎯 Arquitectura Modular

Cada módulo contiene:
- \`*.controller.js\` - Lógica de controladores
- \`*.service.js\` - Lógica de negocio
- \`*.routes.js\` - Definición de rutas
- \`*.validation.js\` - Validaciones (opcional)

## 📦 Instalación

### Prerrequisitos

- Node.js 16+
- PostgreSQL 12+
- Llama 3.1 (opcional, para IA)
- Git

### Pasos

1. **Clonar el repositorio**
\`\`\`bash
git clone https://github.com/tu-usuario/backend-alumnos.git
cd backend-alumnos
\`\`\`

2. **Instalar dependencias**
\`\`\`bash
npm install
\`\`\`

3. **Configurar variables de entorno**
\`\`\`bash
cp .env.example .env
# Editar .env con tus credenciales
\`\`\`

4. **Crear base de datos**
\`\`\`sql
CREATE DATABASE scancvai_db;
\`\`\`

5. **Ejecutar migraciones**
\`\`\`bash
npx sequelize-cli db:migrate
\`\`\`

6. **Poblar datos iniciales (opcional)**
\`\`\`bash
npm run seed:carreras
node src/scripts/create-admin.js
\`\`\`

7. **Iniciar servidor**
\`\`\`bash
npm run dev
\`\`\`

## ⚙️ Configuración

### Variables de Entorno

Ver [.env.example](.env.example) para todas las variables disponibles.

Principales:

\`\`\`env
# Base de datos
DB_HOST=localhost
DB_NAME=scancvai_db
DB_USER=postgres
DB_PASSWORD=tu_password

# JWT
JWT_SECRET=tu_secret_muy_seguro

# Frontend (CORS)
FRONTEND_URL=http://localhost:5173

# Llama 3.1
LLAMA_API_URL=http://127.0.0.1:1234/v1
\`\`\`

### Llama 3.1 Setup (opcional)

1. Instalar [LM Studio](https://lmstudio.ai/) o similar
2. Descargar modelo Llama 3.1 8B
3. Iniciar servidor local en puerto 1234
4. El backend detectará automáticamente la conexión

## 🎮 Uso

### Iniciar en Desarrollo
\`\`\`bash
npm run dev
\`\`\`

### Iniciar en Producción
\`\`\`bash
npm start
\`\`\`

### Acceder a la API
- **Base URL**: \`http://localhost:3000/api\`
- **Health Check**: \`http://localhost:3000/api/health\`
- **Metrics**: \`http://localhost:3000/api/metrics\` (requiere auth)

## 📚 API Documentation

### Endpoints Principales

#### Autenticación (\`/api/auth\`)
- \`POST /register\` - Registrar usuario
- \`POST /login\` - Iniciar sesión
- \`POST /google\` - Login con Google
- \`POST /refresh\` - Refrescar token
- \`POST /logout\` - Cerrar sesión
- \`GET /profile\` - Obtener perfil (auth)

#### CVs (\`/api/cv\`)
- \`GET /\` - Listar CVs del usuario (auth)
- \`POST /upload\` - Subir y analizar CV (auth)
- \`GET /:id\` - Obtener CV específico (auth)
- \`DELETE /:id\` - Eliminar CV (auth)

#### Entrevistas (\`/api/entrevistas\`)
- \`POST /iniciar\` - Iniciar nueva entrevista (auth)
- \`POST /:id/responder\` - Enviar respuesta (auth)
- \`POST /:id/finalizar\` - Finalizar entrevista (auth)
- \`GET /historial\` - Ver historial (auth)

#### Informes (\`/api/informes\`)
- \`GET /:id\` - Obtener informe (auth)
- \`GET /:id/pdf\` - Descargar PDF (auth)

#### Dashboard (\`/api/dashboard\`)
- \`GET /stats\` - Estadísticas generales (auth)
- \`GET /analytics\` - Analytics detallado (auth)

#### Admin (\`/api/admin\`)
- \`GET /users\` - Listar usuarios (admin)
- \`GET /stats\` - Estadísticas del sistema (admin)
- \`PUT /users/:id\` - Actualizar usuario (admin)

Ver documentación completa en [API.md](./docs/API.md) (pendiente).

## 🛠️ Scripts Disponibles

\`\`\`bash
# Desarrollo
npm run dev              # Iniciar con nodemon

# Producción
npm start                # Iniciar servidor

# Base de datos
npm run seed:carreras    # Poblar carreras

# Mantenimiento
npm run test-services    # Probar servicios
npm run clean-logs       # Limpiar logs antiguos

# Migraciones
npx sequelize-cli db:migrate              # Ejecutar migraciones
npx sequelize-cli db:migrate:undo         # Revertir última migración
npx sequelize-cli migration:generate      # Crear nueva migración
\`\`\`

## 🏗️ Migración de Estructura

Si necesitas reorganizar la estructura del proyecto:

\`\`\`bash
# Ver cambios sin aplicar
node migrate-structure.js --dry-run

# Aplicar migración
node migrate-structure.js

# Actualizar imports
node update-imports.js
\`\`\`

## 🧪 Testing

(Pendiente de implementación)

\`\`\`bash
npm test              # Ejecutar todos los tests
npm run test:unit     # Tests unitarios
npm run test:integration  # Tests de integración
\`\`\`

## 📝 Logs

Los logs se guardan en \`./logs/\`:
- \`combined.log\` - Todos los logs
- \`error.log\` - Solo errores
- \`access.log\` - Peticiones HTTP

Rotación automática cada 7 días.

## 🔒 Seguridad

- ✅ Rate limiting (100 req/15min)
- ✅ Sanitización de inputs
- ✅ JWT con refresh tokens
- ✅ CORS configurado
- ✅ Validación de archivos
- ✅ Hashing de passwords (bcrypt)
- ✅ Monitoreo de anomalías

## 🤝 Contribuir

(Pendiente - agregar guías de contribución)

## 📄 Licencia

ISC

## 👥 Autores

- Sistema CV & Entrevistas - Proyecto de Tesis

## 🆘 Soporte

Para reportar bugs o solicitar features:
- Issues: [GitHub Issues](https://github.com/tu-usuario/backend-alumnos/issues)
- Email: soporte@scancvai.com

---

**Hecho con ❤️ para estudiantes universitarios**
