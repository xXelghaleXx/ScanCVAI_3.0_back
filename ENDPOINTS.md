# 📋 LISTA COMPLETA DE ENDPOINTS - API BACKEND

**Base URL Production:** `https://scancvai-3-0-back.onrender.com/api`
**Base URL Local:** `http://localhost:10000/api`

---

## 🏥 SISTEMA / HEALTH CHECK

### Sin autenticación
```http
GET /health
GET /metrics (requiere autenticación)
```

**Ejemplo:**
```
GET https://scancvai-3-0-back.onrender.com/api/health
```

---

## 🔐 AUTENTICACIÓN (/auth)

### Públicas (sin token)
```http
POST /auth/register
POST /auth/login
POST /auth/google
POST /auth/google/callback
POST /auth/refresh
```

### Protegidas (requieren token)
```http
POST /auth/logout
GET  /auth/profile
PUT  /auth/profile
GET  /auth/stats
POST /auth/change-password
```

**Ejemplos:**

**Registro:**
```http
POST https://scancvai-3-0-back.onrender.com/api/auth/register
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "correo": "juan@example.com",
  "password": "123456"
}
```

**Login:**
```http
POST https://scancvai-3-0-back.onrender.com/api/auth/login
Content-Type: application/json

{
  "correo": "juan@example.com",
  "password": "123456"
}
```

**Login con Google:**
```http
POST https://scancvai-3-0-back.onrender.com/api/auth/google
Content-Type: application/json

{
  "credential": "GOOGLE_JWT_TOKEN_HERE"
}
```

---

## 📄 CVs (/cv)

**Todas requieren autenticación**

```http
POST   /cv/upload
POST   /cv/:cvId/procesar
POST   /cv/:cvId/informe
GET    /cv
GET    /cv/historial
GET    /cv/historial/estadisticas
GET    /cv/historial/buscar
GET    /cv/historial/exportar
GET    /cv/historial/comparar
DELETE /cv/:cvId
```

**Ejemplos:**

**Subir CV:**
```http
POST https://scancvai-3-0-back.onrender.com/api/cv/upload
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

cv: [archivo.pdf]
```

**Procesar CV con IA:**
```http
POST https://scancvai-3-0-back.onrender.com/api/cv/123/procesar
Authorization: Bearer YOUR_TOKEN
```

**Generar informe:**
```http
POST https://scancvai-3-0-back.onrender.com/api/cv/123/informe
Authorization: Bearer YOUR_TOKEN
```

**Obtener todos los CVs:**
```http
GET https://scancvai-3-0-back.onrender.com/api/cv
Authorization: Bearer YOUR_TOKEN
```

**Obtener historial paginado:**
```http
GET https://scancvai-3-0-back.onrender.com/api/cv/historial?page=1&limit=10&sort=desc
Authorization: Bearer YOUR_TOKEN
```

**Buscar en historial:**
```http
GET https://scancvai-3-0-back.onrender.com/api/cv/historial/buscar?q=javascript
Authorization: Bearer YOUR_TOKEN
```

---

## 💬 ENTREVISTAS (/entrevistas)

**Todas requieren autenticación**

```http
POST /entrevistas/iniciar
POST /entrevistas/:entrevistaId/mensaje
POST /entrevistas/:entrevistaId/finalizar
POST /entrevistas/:entrevistaId/abandonar
GET  /entrevistas
GET  /entrevistas/:entrevistaId/historial
GET  /entrevistas/estadisticas/resumen
```

**Ejemplos:**

**Iniciar entrevista:**
```http
POST https://scancvai-3-0-back.onrender.com/api/entrevistas/iniciar
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "carreraId": 1,
  "cvId": 123
}
```

**Enviar mensaje en entrevista:**
```http
POST https://scancvai-3-0-back.onrender.com/api/entrevistas/456/mensaje
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "mensaje": "Mi experiencia en programación..."
}
```

**Finalizar entrevista:**
```http
POST https://scancvai-3-0-back.onrender.com/api/entrevistas/456/finalizar
Authorization: Bearer YOUR_TOKEN
```

---

## 📊 INFORMES (/informes)

**Todas requieren autenticación**

```http
GET    /informes
GET    /informes/:informeId
GET    /informes/:informeId/pdf
GET    /informes/estadisticas/resumen
POST   /informes/:informeId/enviar-email
DELETE /informes/:informeId
```

**Ejemplos:**

**Obtener todos los informes:**
```http
GET https://scancvai-3-0-back.onrender.com/api/informes
Authorization: Bearer YOUR_TOKEN
```

**Obtener informe específico:**
```http
GET https://scancvai-3-0-back.onrender.com/api/informes/789
Authorization: Bearer YOUR_TOKEN
```

**Descargar PDF:**
```http
GET https://scancvai-3-0-back.onrender.com/api/informes/789/pdf
Authorization: Bearer YOUR_TOKEN
```

---

## 📊 DASHBOARD (/dashboard)

**Todas requieren autenticación**

```http
GET /dashboard
GET /dashboard/estadisticas
GET /dashboard/recomendaciones
GET /dashboard/analytics
```

**Ejemplos:**

**Dashboard principal:**
```http
GET https://scancvai-3-0-back.onrender.com/api/dashboard
Authorization: Bearer YOUR_TOKEN
```

---

## 🎓 CARRERAS (/carreras)

**Todas requieren autenticación**

```http
GET /carreras
GET /carreras/:carreraId
GET /carreras/metadata/areas
```

**Ejemplos:**

**Obtener todas las carreras:**
```http
GET https://scancvai-3-0-back.onrender.com/api/carreras
Authorization: Bearer YOUR_TOKEN
```

**Filtrar por área:**
```http
GET https://scancvai-3-0-back.onrender.com/api/carreras?area=tecnologia
Authorization: Bearer YOUR_TOKEN
```

---

## 💪 HABILIDADES (/habilidades)

**Todas requieren autenticación**

```http
GET /habilidades/tipos
GET /habilidades/tipo/:tipoId
GET /habilidades/buscar
GET /habilidades/estadisticas
```

**Ejemplos:**

**Buscar habilidades:**
```http
GET https://scancvai-3-0-back.onrender.com/api/habilidades/buscar?q=javascript
Authorization: Bearer YOUR_TOKEN
```

---

## ❓ PREGUNTAS (/preguntas)

**Todas requieren autenticación**

```http
GET /preguntas
GET /preguntas/aleatoria
GET /preguntas/buscar
GET /preguntas/estadisticas
```

**Ejemplos:**

**Obtener pregunta aleatoria:**
```http
GET https://scancvai-3-0-back.onrender.com/api/preguntas/aleatoria
Authorization: Bearer YOUR_TOKEN
```

---

## 👨‍💼 ADMIN (/admin)

**Requieren autenticación + rol admin**

```http
GET /admin/usuarios
GET /admin/usuarios/:userId
GET /admin/dashboard
PUT /admin/usuarios/:userId/rol
PUT /admin/usuarios/:userId/estado
```

**Ejemplos:**

**Obtener todos los usuarios:**
```http
GET https://scancvai-3-0-back.onrender.com/api/admin/usuarios?page=1&limit=20
Authorization: Bearer YOUR_ADMIN_TOKEN
```

---

## 🔑 HEADERS REQUERIDOS

### Para rutas protegidas:
```http
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

### Para upload de archivos:
```http
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: multipart/form-data
```

---

## ⚙️ QUERY PARAMETERS COMUNES

### Paginación:
```
?page=1&limit=10
```

### Ordenamiento:
```
?sort=desc (o asc)
```

### Búsqueda:
```
?q=termino_busqueda
```

### Filtros:
```
?area=tecnologia
?estado=activo
?rol=alumno
```

---

## 📝 CÓDIGOS DE RESPUESTA

- `200` - OK (éxito)
- `201` - Created (recurso creado)
- `400` - Bad Request (datos inválidos)
- `401` - Unauthorized (no autenticado)
- `403` - Forbidden (sin permisos)
- `404` - Not Found (no encontrado)
- `429` - Too Many Requests (rate limit excedido)
- `500` - Internal Server Error (error del servidor)
- `503` - Service Unavailable (servicio no disponible)

---

## 🧪 PRUEBAS RECOMENDADAS

### 1. Health Check
```http
GET https://scancvai-3-0-back.onrender.com/api/health
```
✅ Debe devolver `200 OK` con `status: "healthy"`

### 2. Registro
```http
POST https://scancvai-3-0-back.onrender.com/api/auth/register
```

### 3. Login
```http
POST https://scancvai-3-0-back.onrender.com/api/auth/login
```
✅ Guarda el `access_token` de la respuesta

### 4. Perfil de usuario
```http
GET https://scancvai-3-0-back.onrender.com/api/auth/profile
Authorization: Bearer {token_del_paso_3}
```

---

## 📦 IMPORTAR A POSTMAN

1. Crea una nueva colección
2. Configura variable de entorno `BASE_URL`:
   - Production: `https://scancvai-3-0-back.onrender.com/api`
   - Local: `http://localhost:10000/api`
3. Configura variable `TOKEN` después del login
4. Usa `{{BASE_URL}}` y `{{TOKEN}}` en tus requests

---

**Última actualización:** 2025-10-22
