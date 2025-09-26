const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Crear carpetas si no existen
const createUploadDirs = () => {
  const dirs = ['uploads', 'uploads/cvs', 'uploads/temp'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Carpeta creada: ${dir}`);
    }
  });
};

// Inicializar directorios
createUploadDirs();

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/cvs/');
  },
  filename: (req, file, cb) => {
    // Generar nombre único: timestamp_userId_originalName
    const userId = req.user?.id || 'anonymous';
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/\s+/g, '_'); // Reemplazar espacios
    const fileName = `${timestamp}_${userId}_${originalName}`;
    cb(null, fileName);
  }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  // Tipos MIME permitidos
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword' // .doc (opcional)
  ];

  // Extensiones permitidas
  const allowedExtensions = ['.pdf', '.docx', '.doc'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    const error = new Error('Formato de archivo no válido. Solo se permiten archivos PDF, DOC y DOCX.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Configuración principal de multer
const upload = multer({
  storage: storage,
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
      return res.status(500).json({ 
        error: 'Error interno del servidor: ' + err.message 
      });
    }
    
    // RF-101: Validación adicional
    if (req.file) {
      // Validar tamaño mínimo (1KB)
      if (req.file.size < 1024) {
        // Eliminar archivo muy pequeño
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          error: 'Archivo muy pequeño. Mínimo: 1KB' 
        });
      }

      // Agregar metadata útil
      req.file.uploadedAt = new Date();
      req.file.originalSize = req.file.size;
      req.file.sizeFormatted = formatBytes(req.file.size);
      
      console.log(`📄 CV subido: ${req.file.filename} (${req.file.sizeFormatted})`);
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

// Utility: Eliminar archivo
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Archivo eliminado: ${filePath}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error eliminando archivo: ${filePath}`, error);
    return false;
  }
};

// Middleware para eliminar archivos temporales en caso de error
const cleanupOnError = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  const cleanup = () => {
    if (req.file && res.statusCode >= 400) {
      deleteFile(req.file.path);
    }
  };
  
  res.send = function(body) {
    cleanup();
    originalSend.call(this, body);
  };
  
  res.json = function(body) {
    cleanup();
    originalJson.call(this, body);
  };
  
  next();
};

module.exports = {
  uploadCV,
  upload,
  deleteFile,
  formatBytes,
  cleanupOnError,
  createUploadDirs
};