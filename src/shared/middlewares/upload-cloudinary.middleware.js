const multer = require("multer");
const path = require("path");
const { cvStorage, isConfigured } = require("../services/cloudinary.service");

/**
 * Middleware de Upload usando Cloudinary
 * Sube archivos directamente a la nube en lugar de almacenarlos localmente
 */

// Verificar configuración de Cloudinary
if (!isConfigured()) {
  console.warn(`
    ⚠️  CLOUDINARY NO CONFIGURADO

    Agrega las siguientes variables a tu archivo .env:

    CLOUDINARY_CLOUD_NAME=tu_cloud_name
    CLOUDINARY_API_KEY=tu_api_key
    CLOUDINARY_API_SECRET=tu_api_secret

    Mientras tanto, se usará almacenamiento local.
  `);
}

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  // Tipos MIME permitidos (incluyendo variaciones comunes)
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'application/octet-stream', // Algunos navegadores usan esto para DOCX
    'application/x-zip-compressed', // A veces DOCX se detecta así
    'application/zip' // DOCX es técnicamente un ZIP
  ];

  // Extensiones permitidas
  const allowedExtensions = ['.pdf', '.docx', '.doc'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  // Verificar primero por extensión (más confiable)
  if (allowedExtensions.includes(fileExtension)) {
    console.log(`✅ Archivo aceptado por extensión: ${file.originalname} (MIME: ${file.mimetype})`);
    cb(null, true);
  } else if (allowedMimes.includes(file.mimetype)) {
    // Fallback: verificar por MIME type si la extensión no está clara
    console.log(`✅ Archivo aceptado por MIME type: ${file.originalname} (MIME: ${file.mimetype})`);
    cb(null, true);
  } else {
    console.log(`❌ Archivo rechazado: ${file.originalname} (MIME: ${file.mimetype}, Ext: ${fileExtension})`);
    const error = new Error(`Formato de archivo no válido. Solo se permiten archivos PDF, DOC y DOCX. Recibido: ${fileExtension} (MIME: ${file.mimetype})`);
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Configuración principal de multer con Cloudinary
const upload = multer({
  storage: cvStorage, // Usa Cloudinary storage
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 1 // Solo un archivo por vez
  }
});

// Middleware personalizado con manejo de errores
const uploadCV = (req, res, next) => {
  const singleUpload = upload.single('cv');

  singleUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Errores específicos de multer
      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          return res.status(400).json({
            error: 'Archivo muy grande. Tamaño máximo: 10MB'
          });
        case 'LIMIT_FILE_COUNT':
          return res.status(400).json({
            error: 'Solo se permite un archivo por vez'
          });
        case 'LIMIT_UNEXPECTED_FILE':
          return res.status(400).json({
            error: 'Campo de archivo no esperado. Usar "cv"'
          });
        default:
          return res.status(400).json({
            error: 'Error en la subida del archivo: ' + err.message
          });
      }
    } else if (err && err.code === 'INVALID_FILE_TYPE') {
      // Error personalizado de tipo de archivo
      return res.status(400).json({ error: err.message });
    } else if (err) {
      // Otros errores
      console.error('❌ Error en upload:', err);
      return res.status(500).json({
        error: 'Error interno del servidor: ' + err.message
      });
    }

    // Validación adicional
    if (req.file) {
      // Validar tamaño mínimo (1KB)
      if (req.file.size < 1024) {
        return res.status(400).json({
          error: 'Archivo muy pequeño. Mínimo: 1KB'
        });
      }

      // Agregar metadata útil desde Cloudinary
      req.file.uploadedAt = new Date();
      req.file.originalSize = req.file.size;
      req.file.sizeFormatted = formatBytes(req.file.size);
      req.file.cloudinaryUrl = req.file.path; // Cloudinary pone la URL en path
      req.file.publicId = req.file.filename; // Cloudinary pone el public_id en filename
      req.file.originalExtension = path.extname(req.file.originalname).toLowerCase(); // Guardar extensión original

      console.log(`☁️  CV subido a Cloudinary: ${req.file.filename} (${req.file.sizeFormatted})`);
      console.log(`🔗 URL: ${req.file.path}`);
      console.log(`📄 Extensión: ${req.file.originalExtension}`);
    }

    next();
  });
};

// Utility: Formatear bytes
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

module.exports = {
  uploadCV,
  upload,
  formatBytes
};
