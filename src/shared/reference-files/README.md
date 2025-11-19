# 📄 CV de Referencia Oficial de TECSUP

Este directorio contiene el **CV de ejemplo oficial de TECSUP** que se utiliza como plantilla estándar para evaluar los CVs de los usuarios según los estándares profesionales de la institución.

## 🎯 Propósito

El archivo `CV_ejemplo.docx` sirve como **estándar oficial de TECSUP** para:

1. **Comparar estructura**: El sistema compara la estructura del CV del usuario con el formato profesional de TECSUP
2. **Identificar diferencias**: Detecta qué secciones o información le falta al CV del usuario según los estándares de TECSUP
3. **Generar recomendaciones**: Proporciona sugerencias específicas basadas en las mejores prácticas de TECSUP
4. **Evaluar calidad**: Calcula un porcentaje de similitud con el CV ideal de TECSUP
5. **Validar estándares**: Verifica que el CV cumpla con los requisitos profesionales esperados por TECSUP

## 🔧 Cómo funciona

Cuando un usuario sube su CV:

1. El sistema extrae el texto del CV del usuario
2. Carga el contenido del `CV_ejemplo.docx` (CV de referencia oficial de TECSUP)
3. Envía ambos CVs a la IA con un prompt comparativo basado en estándares TECSUP
4. La IA analiza las diferencias según los criterios de TECSUP y genera:
   - ✅ Fortalezas del CV del usuario según estándares TECSUP
   - ⚠️ Áreas de mejora comparadas con el CV oficial de TECSUP
   - 📊 Diferencias específicas con el formato TECSUP
   - 💡 Recomendaciones concretas basadas en mejores prácticas TECSUP
   - 📈 Porcentaje de similitud con el CV ideal de TECSUP
   - ✔️ Verificación de cumplimiento con estándares TECSUP

## 📁 Ubicación del archivo

```
backend-alumnos/
└── src/
    └── shared/
        └── reference-files/
            ├── CV_ejemplo.docx    ← CV de referencia
            └── README.md          ← Este archivo
```

## 🔄 Actualizar el CV de referencia

Si necesitas actualizar el CV de ejemplo:

1. Reemplaza el archivo `CV_ejemplo.docx` con la nueva versión
2. Asegúrate de que sea un archivo `.docx` válido
3. Reinicia el servidor backend para que cargue el nuevo archivo
4. El sistema automáticamente extraerá el contenido del nuevo CV

```bash
# Ubicar el nuevo CV en:
backend-alumnos/src/shared/reference-files/CV_ejemplo.docx

# Reiniciar el servidor
npm run dev
```

## ⚙️ Implementación técnica

### Servicio: `reference-cv.service.js`

Este servicio maneja:
- ✅ Carga y extracción del texto del CV de referencia
- ✅ Generación del prompt comparativo para la IA
- ✅ Caché del contenido (se carga una sola vez al iniciar)

### Integración: `llama.service.js`

El método `analizarCV()` automáticamente:
1. Intenta usar el CV de referencia para comparación
2. Si no está disponible, usa análisis estándar (fallback)
3. Genera un análisis comparativo cuando el CV de referencia existe

### Respuesta extendida del API

El análisis ahora incluye campos adicionales:

```json
{
  "analisis": {
    "fortalezas": [...],
    "habilidades_tecnicas": [...],
    "habilidades_blandas": [...],
    "areas_mejora": [...],
    // ⬇️ NUEVOS CAMPOS ⬇️
    "diferencias_con_referencia": [
      "Falta sección de proyectos destacados",
      "No incluye certificaciones como el CV ideal"
    ],
    "recomendaciones_especificas": [
      "Agregar sección de proyectos como en el CV ideal",
      "Incluir certificaciones relevantes"
    ],
    "similitud_con_ideal": 75
  }
}
```

## 🎨 Frontend - Cómo mostrar la información

El frontend puede usar estos nuevos campos para:

1. **Mostrar porcentaje de similitud**: `similitud_con_ideal`
2. **Resaltar diferencias**: `diferencias_con_referencia`
3. **Mostrar tips específicos**: `recomendaciones_especificas`

Ejemplo de UI:

```
┌─────────────────────────────────────┐
│ 📊 Similitud con CV Ideal: 75%     │
│ ████████████████░░░░░               │
│                                     │
│ 📋 Diferencias encontradas:         │
│ • Falta sección de proyectos        │
│ • No incluye certificaciones        │
│                                     │
│ 💡 Recomendaciones:                 │
│ • Agregar sección de proyectos      │
│ • Incluir certificaciones           │
└─────────────────────────────────────┘
```

## ⚠️ Notas importantes

- El archivo `CV_ejemplo.docx` debe estar en formato `.docx` (Word)
- Si el archivo no existe o no se puede leer, el sistema automáticamente usa análisis estándar
- El contenido se carga una sola vez cuando inicia el servidor (patrón Singleton)
- No se sube a Git (para privacidad), asegúrate de tenerlo localmente

## 🧪 Testing

Para verificar que el CV de referencia está cargado correctamente:

```bash
# Iniciar servidor
npm run dev

# Deberías ver en los logs:
# ✅ CV de referencia cargado correctamente
```

## 📝 Changelog

- **2025-11-18**: Implementación inicial del sistema de CV de referencia
- **2025-11-18**: Integración con análisis de IA comparativo
- **2025-11-18**: Documentación creada

---

**Última actualización**: 2025-11-18
**Mantenedor**: Sistema ScanCVAI 3.0
