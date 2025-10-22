# 🚀 Configurar Groq API (IA Gratis para Producción)

## ¿Qué es Groq?

Groq es un servicio de IA que ofrece **Llama 3.1 70B GRATIS** con una API compatible con OpenAI. Es perfecto para tu proyecto en producción porque:

- ✅ **100% GRATIS** (con límites razonables)
- ✅ Usa **Llama 3.1** (igual que tu local)
- ✅ **Muy rápido** (~280 tokens/segundo)
- ✅ API compatible con OpenAI
- ✅ No requiere tarjeta de crédito

---

## 📋 Paso 1: Crear Cuenta en Groq

1. Ve a https://console.groq.com
2. Click en **"Sign Up"**
3. Regístrate con tu email o GitHub
4. **No necesitas tarjeta de crédito**

---

## 🔑 Paso 2: Obtener API Key

1. Una vez dentro, ve a **API Keys** en el menú lateral
2. Click en **"Create API Key"**
3. Dale un nombre: `scancvai-production`
4. Click **"Submit"**
5. **COPIA LA KEY** (se muestra solo una vez)

La key se verá así:
```
gsk_abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yzab5678cdef
```

---

## ⚙️ Paso 3: Configurar en tu Proyecto

### A) Reemplazar el archivo llama.service.js

```bash
# En tu carpeta backend-alumnos
mv src/shared/services/llama.service.js src/shared/services/llama.service.OLD.js
mv src/shared/services/llama.service.UPDATED.js src/shared/services/llama.service.js
```

O simplemente copia el contenido de `llama.service.UPDATED.js` a `llama.service.js`

### B) Actualizar variables de entorno

#### **Para desarrollo local** (`.env`):

```env
# Usar Groq en lugar de Llama local
AI_PROVIDER=groq
GROQ_API_KEY=gsk_tu_api_key_aqui

# Opcional: mantener Llama local como fallback
LLAMA_BASE_URL=http://127.0.0.1:1234
```

#### **Para producción en Render**:

Agrega estas variables en Render → Environment:

```env
AI_PROVIDER=groq
GROQ_API_KEY=gsk_tu_api_key_aqui
```

---

## 🎯 Paso 4: Probar la Configuración

```bash
# Probar localmente
npm run dev
```

Deberías ver en los logs:
```
🧪 Probando conexión con GROQ...
✅ Conexión exitosa con groq: OK
```

---

## 📊 Límites Gratuitos de Groq

| Límite | Valor |
|--------|-------|
| Requests por minuto | 30 |
| Requests por día | 14,400 |
| Tokens por minuto | 6,000 |
| Tokens por request | Sin límite específico |

**Suficiente para:**
- ~480 análisis de CV por día
- ~480 entrevistas por día
- Perfecto para pruebas y uso mediano

---

## 🔄 Fallback Automático

El servicio actualizado tiene **fallback automático**:

1. Intenta con el provider configurado (`groq`, `local`, `openai`)
2. Si falla, intenta automáticamente con Groq (si está configurado)
3. Si todo falla, retorna respuestas de fallback

**Ejemplo:**
```
LLAMA_BASE_URL=http://127.0.0.1:1234  ← No disponible en producción
AI_PROVIDER=local                      ← Intenta primero local
GROQ_API_KEY=gsk_...                  ← Fallback automático a Groq
```

---

## 🌐 Modelos Disponibles en Groq

```javascript
// Para análisis rápido
'llama-3.1-8b-instant'  // Más rápido, menos preciso

// Para análisis detallado (RECOMENDADO)
'llama-3.1-70b-versatile'  // Más preciso, un poco más lento

// Para tareas mixtas
'mixtral-8x7b-32768'  // Gran contexto
```

El servicio usa por defecto `llama-3.1-70b-versatile` que es el mejor balance.

---

## 🎨 Opciones de Configuración

### Opción 1: Solo Groq (Recomendado para producción)

```env
AI_PROVIDER=groq
GROQ_API_KEY=gsk_tu_key
```

### Opción 2: Llama Local con Groq Fallback (Desarrollo)

```env
AI_PROVIDER=local
LLAMA_BASE_URL=http://127.0.0.1:1234
GROQ_API_KEY=gsk_tu_key  # Se usa automáticamente si local falla
```

### Opción 3: OpenAI (Si quieres pagar)

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-tu_key
```

---

## 🔍 Verificar que Funciona

### Test 1: Health Check

```bash
curl http://localhost:3000/api/health
```

Debería mostrar:
```json
{
  "services": {
    "llama": "connected (groq)"
  }
}
```

### Test 2: Subir un CV

1. Sube un CV desde el frontend
2. Procesa el CV
3. Los logs mostrarán:
```
Respuesta de IA (groq): {"fortalezas":["..."],...}
```

---

## 💰 Comparación de Costos

| Servicio | Costo por 1M tokens | Gratuito |
|----------|---------------------|----------|
| **Groq** | **$0.00** | ✅ Sí (con límites) |
| OpenAI GPT-3.5 | $0.50 | ❌ No |
| OpenAI GPT-4 | $30.00 | ❌ No |
| Llama Local | $0.00 | ✅ Sí (pero no funciona en Render) |

---

## 🐛 Troubleshooting

### Error: "Invalid API Key"

- Verifica que copiaste la key completa
- Asegúrate que empiece con `gsk_`
- Crea una nueva key en https://console.groq.com

### Error: "Rate limit exceeded"

- Espera 1 minuto y reintenta
- Considera reducir `max_tokens` en las opciones
- Upgrade a plan pago si necesitas más

### Los análisis son muy lentos

- Es normal la primera vez (cold start)
- Groq suele ser muy rápido (< 1 segundo)
- Verifica tu conexión a internet

---

## 📚 Documentación Oficial

- Groq Console: https://console.groq.com
- Groq Docs: https://console.groq.com/docs/quickstart
- Modelos disponibles: https://console.groq.com/docs/models

---

## ✅ Checklist Final

Antes de desplegar en Render:

- [ ] Creaste cuenta en Groq
- [ ] Obtuviste la API Key
- [ ] Reemplazaste `llama.service.js` con la versión actualizada
- [ ] Agregaste `AI_PROVIDER=groq` en Render
- [ ] Agregaste `GROQ_API_KEY=gsk_...` en Render
- [ ] Probaste localmente que funciona
- [ ] Subiste los cambios a GitHub

---

**¡Listo! Ahora tu IA funciona en producción sin costo** 🎉
