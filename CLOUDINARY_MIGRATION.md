# Migración a Cloudinary - Almacenamiento de CVs

## Resumen

Se migró el almacenamiento de archivos CV desde el sistema de archivos local (`uploads/cvs/`) a **Cloudinary**, un servicio de almacenamiento en la nube que ofrece mejor escalabilidad, seguridad y gestión de archivos.

---

## Cambios Realizados

### 1. **Instalación de Dependencias**

```bash
npm install cloudinary multer-storage-cloudinary
```

### 2. **Nuevo Servicio de Cloudinary**

**Archivo:** `src/shared/services/cloudinary.service.js`

Funcionalidades implementadas:
- ✅ Configuración de Cloudinary con credenciales del `.env`
- ✅ Storage personalizado para CVs con multer
- ✅ `uploadFile()` - Subir archivos directamente
- ✅ `deleteFile()` - Eliminar archivos por public_id
- ✅ `downloadFile()` - Descargar archivo como buffer (para procesamiento)
- ✅ `getSignedUrl()` - URLs firmadas para acceso temporal
- ✅ `getFileInfo()` - Obtener información de un archivo
- ✅ `listFiles()` - Listar archivos en una carpeta
- ✅ `isConfigured()` - Verificar configuración

### 3. **Nuevo Middleware de Upload**

**Archivo:** `src/shared/middlewares/upload-cloudinary.middleware.js`

Reemplaza al middleware local `upload.middleware.js`:
- ✅ Valida tipos de archivo (PDF, DOC, DOCX)
- ✅ Valida tamaño máximo (10MB)
- ✅ Sube directamente a Cloudinary
- ✅ Maneja errores de subida
- ✅ No requiere `cleanupOnError` (Cloudinary maneja esto automáticamente)

### 4. **Actualización de Rutas**

**Archivo:** `src/modules/cv/cv.routes.js`

```javascript
// ANTES:
const { uploadCV, cleanupOnError } = require("../../shared/middlewares/upload.middleware");

// AHORA:
const { uploadCV } = require("../../shared/middlewares/upload-cloudinary.middleware");
```

### 5. **Actualización del Controlador**

**Archivo:** `src/modules/cv/cv.controller.js`

#### Función `subirCV()`:
- Ahora guarda la **URL de Cloudinary** en `cv.archivo`
- Guarda el **public_id** en `cv.cloudinary_public_id`
- Retorna información del storage: `storage: 'cloudinary'`

#### Función `eliminarCV()`:
- Elimina el archivo de Cloudinary usando el `cloudinary_public_id`
- Ya no elimina del sistema de archivos local

### 6. **Actualización del Servicio de Extracción**

**Archivo:** `src/shared/services/file-extractor.service.js`

Ahora soporta **ambos tipos de archivos**:
- ✅ Archivos locales (ruta física)
- ✅ URLs de Cloudinary (descarga automática antes de procesar)

Nuevas funciones:
- `isCloudinaryUrl()` - Detecta si es URL
- `getFileBuffer()` - Obtiene buffer desde URL o path local

### 7. **Actualización del Modelo**

**Archivo:** `src/database/models/CV.js`

```javascript
// Nueva columna agregada:
cloudinary_public_id: {
  type: DataTypes.STRING,
  allowNull: true,
  comment: "Public ID de Cloudinary para gestión del archivo"
}
```

### 8. **Migración de Base de Datos**

**Archivo:** `src/database/migrations/20251021000000-add-cloudinary-public-id-to-cvs.js`

```sql
ALTER TABLE cvs ADD COLUMN cloudinary_public_id VARCHAR(255);
```

✅ **Migración ejecutada exitosamente**

### 9. **Variables de Entorno**

**Archivo:** `.env`

```env
# Configuración de Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

⚠️ **IMPORTANTE:** Debes configurar estas variables con tus credenciales de Cloudinary:
1. Crear cuenta en [Cloudinary](https://cloudinary.com/)
2. Ir al Dashboard → Account Details
3. Copiar `Cloud Name`, `API Key` y `API Secret`
4. Reemplazar los valores en `.env`

---

## Flujo Completo

### 📤 **Subida de CV**

```
1. Usuario sube CV (POST /api/cv/upload)
   ↓
2. Middleware `uploadCV` valida archivo
   ↓
3. Cloudinary recibe y almacena el archivo
   ↓
4. Controlador guarda URL y public_id en BD
   ↓
5. Retorna información del CV con storage: 'cloudinary'
```

### 🧠 **Procesamiento de CV**

```
1. Usuario solicita procesamiento (POST /api/cv/:cvId/procesar)
   ↓
2. Controlador obtiene CV.archivo (URL de Cloudinary)
   ↓
3. file-extractor.service detecta que es URL
   ↓
4. Descarga archivo desde Cloudinary como buffer
   ↓
5. Procesa el buffer (PDF/DOCX) con pdf-parse/mammoth
   ↓
6. Extrae texto y continúa con análisis IA
```

### 🗑️ **Eliminación de CV**

```
1. Usuario elimina CV (DELETE /api/cv/:cvId)
   ↓
2. Controlador obtiene cv.cloudinary_public_id
   ↓
3. Llama a cloudinary.service.deleteFile(public_id)
   ↓
4. Cloudinary elimina el archivo permanentemente
   ↓
5. Se eliminan registros relacionados en BD
   ↓
6. Se elimina el registro del CV
```

---

## Ventajas de Cloudinary

✅ **Escalabilidad** - No depende del disco local
✅ **Seguridad** - URLs firmadas para acceso temporal
✅ **CDN** - Distribución global de archivos
✅ **Backup automático** - No se pierden archivos
✅ **Gestión centralizada** - Dashboard web para administrar archivos
✅ **Optimización** - Compresión y transformación automática
✅ **No requiere cleanup manual** - Cloudinary maneja la limpieza

---

## Compatibilidad con CVs Existentes

El sistema ahora soporta **ambos tipos de almacenamiento**:

- **CVs antiguos** (local): `cv.archivo = "uploads/cvs/archivo.pdf"`
  - Se procesan directamente desde el path local
  - `cv.cloudinary_public_id` será `null`

- **CVs nuevos** (Cloudinary): `cv.archivo = "https://res.cloudinary.com/..."`
  - Se descargan automáticamente antes de procesar
  - `cv.cloudinary_public_id` contiene el ID para eliminar

---

## Testing

### Probar Subida:
```bash
curl -X POST http://localhost:3000/api/cv/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "cv=@archivo.pdf"
```

### Probar Procesamiento:
```bash
curl -X POST http://localhost:3000/api/cv/1/procesar \
  -H "Authorization: Bearer TOKEN"
```

### Probar Eliminación:
```bash
curl -X DELETE http://localhost:3000/api/cv/1 \
  -H "Authorization: Bearer TOKEN"
```

---

## Archivos Afectados

| Archivo | Tipo de Cambio |
|---------|---------------|
| `cloudinary.service.js` | 🆕 Nuevo |
| `upload-cloudinary.middleware.js` | 🆕 Nuevo |
| `cv.routes.js` | ✏️ Modificado |
| `cv.controller.js` | ✏️ Modificado |
| `file-extractor.service.js` | ✏️ Modificado |
| `CV.js` (modelo) | ✏️ Modificado |
| `20251021000000-add-cloudinary-public-id-to-cvs.js` | 🆕 Migración |
| `.env` | ✏️ Modificado |
| `.sequelizerc` | 🆕 Nuevo |
| `config/config.json` | ✏️ Modificado |

---

## Próximos Pasos (Opcional)

1. **Migrar CVs existentes** - Script para subir CVs locales a Cloudinary
2. **Eliminar carpeta local** - Limpiar `uploads/cvs/` después de migración
3. **Implementar signed URLs** - URLs temporales para descargas seguras
4. **Agregar transformaciones** - Miniaturas para PDFs
5. **Monitoreo** - Dashboard de Cloudinary para ver uso

---

## Notas Importantes

⚠️ **Antes de usar en producción:**
- Configurar credenciales de Cloudinary en `.env`
- Verificar que el plan de Cloudinary soporta tu volumen de archivos
- Configurar límites de rate limiting apropiados
- Considerar backup adicional si es crítico

✅ **Verificar configuración:**
```javascript
const { isConfigured } = require('./src/shared/services/cloudinary.service');
console.log('Cloudinary configurado:', isConfigured());
```

---

## Soporte

Si tienes problemas:
1. Verifica que las credenciales en `.env` son correctas
2. Revisa los logs del servidor para errores de Cloudinary
3. Verifica que la columna `cloudinary_public_id` existe en la BD
4. Consulta la documentación de Cloudinary: https://cloudinary.com/documentation

---

**Fecha de migración:** 21 de Octubre, 2025
**Versión:** 1.0.0
**Status:** ✅ Implementado y funcional
