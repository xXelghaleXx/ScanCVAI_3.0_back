# 🌐 Exponer Llama Local con Ngrok

## Usar tu IA local desde Render con Ngrok

---

## 📋 Paso 1: Instalar Ngrok

### Windows:
1. Descarga: https://ngrok.com/download
2. Descomprime el .zip
3. Mueve `ngrok.exe` a una carpeta (ej: `C:\ngrok\`)
4. Agrega a PATH o úsalo desde esa carpeta

### Verificar instalación:
```bash
ngrok version
```

---

## 🔑 Paso 2: Crear Cuenta en Ngrok

1. Ve a https://ngrok.com/signup
2. Regístrate (gratis)
3. Ve a https://dashboard.ngrok.com/get-started/your-authtoken
4. Copia tu authtoken

### Configurar authtoken:
```bash
ngrok config add-authtoken TU_TOKEN_AQUI
```

---

## 🚀 Paso 3: Exponer tu Llama Local

### Asegúrate que Llama esté corriendo:
```bash
# En LM Studio, inicia el servidor local en puerto 1234
# O con Ollama:
ollama serve
```

### Exponer con ngrok:
```bash
ngrok http 1234
```

Verás algo como:
```
Forwarding  https://abc123-456.ngrok-free.app -> http://localhost:1234
```

---

## 📝 Paso 4: Copiar URL y Configurar Render

### Copiar la URL HTTPS:
```
https://abc123-456.ngrok-free.app
```

### Actualizar en Render → Environment:
```env
LLAMA_BASE_URL=https://abc123-456.ngrok-free.app
AI_PROVIDER=local
```

---

## 🎯 Paso 5: Dominio Estático (Recomendado)

### Plan gratuito:
Ngrok te permite **1 dominio estático gratis**

1. Ve a https://dashboard.ngrok.com/cloud-edge/domains
2. Click "New Domain" o "Claim your free domain"
3. Te asignarán: `tu-nombre.ngrok-free.app`

### Usar dominio estático:
```bash
ngrok http 1234 --domain=tu-nombre.ngrok-free.app
```

Ahora la URL **nunca cambia** aunque reinicies ngrok.

---

## ⚙️ Configuración Permanente

### Crear archivo de config:
```bash
ngrok config edit
```

Agregar:
```yaml
version: "2"
authtoken: TU_TOKEN

tunnels:
  llama:
    proto: http
    addr: 1234
    domain: tu-nombre.ngrok-free.app  # Si tienes dominio estático
```

### Iniciar con config:
```bash
ngrok start llama
```

---

## 🔄 Mantener Ngrok Corriendo (Windows)

### Opción 1: Ejecutar en segundo plano
```bash
start /B ngrok http 1234 --domain=tu-nombre.ngrok-free.app
```

### Opción 2: Crear archivo .bat
```batch
@echo off
ngrok http 1234 --domain=tu-nombre.ngrok-free.app
pause
```

Guarda como `start-ngrok.bat` y ejecútalo al iniciar Windows.

---

## ✅ Verificar que Funciona

1. **Ngrok corriendo:**
   - Verás "Session Status: online"
   - URL pública activa

2. **Probar endpoint:**
```bash
curl https://tu-nombre.ngrok-free.app/v1/models
```

3. **Desde Render:**
   - Los logs mostrarán: "✅ Llama 3.1 conectado correctamente"

---

## 📊 Límites del Plan Gratuito

| Característica | Gratis | Pro ($10/mes) |
|----------------|--------|---------------|
| Túneles simultáneos | 1 | 3 |
| Dominios estáticos | 1 | 3 |
| Requests/minuto | 40 | Ilimitado |
| Ancho de banda | Limitado | Ilimitado |

**Suficiente para:**
- ✅ Desarrollo y pruebas
- ✅ Uso moderado en producción
- ⚠️ No recomendado para tráfico alto

---

## 🚨 Consideraciones Importantes

### Tu PC debe estar:
- ✅ Encendida 24/7
- ✅ Con Llama corriendo
- ✅ Con ngrok activo
- ✅ Conectada a internet

### Si tu PC se apaga:
- ❌ Backend en Render no podrá analizar CVs
- ❌ Entrevistas no funcionarán
- ⚠️ **Solución:** Configurar GROQ como fallback

---

## 🔄 Sistema Híbrido (Recomendado)

Combina ngrok con Groq para máxima confiabilidad:

### En `.env`:
```env
# Prioridad 1: Llama local (via ngrok)
AI_PROVIDER=local
LLAMA_BASE_URL=https://tu-nombre.ngrok-free.app

# Prioridad 2: Groq fallback (si ngrok falla)
GROQ_API_KEY=gsk_...
```

El servicio automáticamente cambia a Groq si ngrok no responde.

---

## 🐛 Troubleshooting

### Error: "Connection refused"
- Verifica que Llama esté corriendo en puerto 1234
- Prueba: `curl http://localhost:1234/v1/models`

### Error: "Invalid host header"
- Ngrok está bloqueando. Usa `--host-header=localhost`
```bash
ngrok http 1234 --host-header=localhost
```

### URL cambia cada vez
- Necesitas dominio estático (gratis en cuenta ngrok)
- O upgrade a plan Pro

### Muy lento
- Verifica tu internet
- Considera usar Groq en su lugar

---

## 💰 Comparación de Costos

| Opción | Costo | Disponibilidad |
|--------|-------|----------------|
| **Ngrok Gratis** | $0 | Cuando PC encendida |
| **Ngrok Pro** | $10/mes | Cuando PC encendida |
| **VPS con GPU** | $15-50/mes | 24/7 |
| **Groq** | **$0** | **24/7** |

---

## ✅ Checklist

- [ ] Instalé ngrok
- [ ] Configuré authtoken
- [ ] Obtuve dominio estático
- [ ] Llama corriendo en puerto 1234
- [ ] Ngrok exponiendo: `ngrok http 1234`
- [ ] Copié URL pública a Render
- [ ] Probé que funciona: `curl https://...`
- [ ] Configuré Groq como fallback

---

**Alternativa recomendada:** Si no quieres tener tu PC encendida 24/7, usa Groq (ver [GROQ_SETUP.md](GROQ_SETUP.md))
