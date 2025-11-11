const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

/**
 * Servicio de Cloudinary para manejo de archivos en la nube
 */

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Storage para CVs usando Cloudinary
 */
const cvStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const userId = req.user?.id || 'anonymous';
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/\s+/g, '_').replace(/\.[^/.]+$/, ''); // Sin extensión

    return {
      folder: 'scancvai/cvs', // Carpeta en Cloudinary
      resource_type: 'raw', // Para archivos que no son imágenes
      public_id: `${timestamp}_${userId}_${originalName}`,
      allowed_formats: ['pdf', 'doc', 'docx'],
      tags: ['cv', `user_${userId}`]
    };
  }
});

/**
 * Subir archivo directamente a Cloudinary (sin multer)
 * @param {string} filePath - Ruta del archivo local
 * @param {object} options - Opciones de subida
 * @returns {Promise<object>} - Resultado de la subida
 */
const uploadFile = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: options.folder || 'scancvai/cvs',
      resource_type: options.resource_type || 'raw',
      public_id: options.public_id,
      tags: options.tags || ['cv'],
      ...options
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes,
      createdAt: result.created_at
    };
  } catch (error) {
    console.error('❌ Error subiendo archivo a Cloudinary:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Eliminar archivo de Cloudinary
 * @param {string} publicId - ID público del archivo
 * @param {string} resourceType - Tipo de recurso (raw, image, video)
 * @returns {Promise<object>} - Resultado de la eliminación
 */
const deleteFile = async (publicId, resourceType = 'raw') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true
    });

    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('❌ Error eliminando archivo de Cloudinary:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Obtener URL temporal firmada (para acceso privado)
 * @param {string} publicId - ID público del archivo
 * @param {number} expiresIn - Tiempo de expiración en segundos (default: 1 hora)
 * @returns {string} - URL firmada
 */
const getSignedUrl = (publicId, expiresIn = 3600) => {
  const timestamp = Math.floor(Date.now() / 1000) + expiresIn;

  return cloudinary.url(publicId, {
    resource_type: 'raw',
    type: 'authenticated',
    sign_url: true,
    expires_at: timestamp
  });
};

/**
 * Obtener información de un archivo
 * @param {string} publicId - ID público del archivo
 * @returns {Promise<object>} - Información del archivo
 */
const getFileInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'raw'
    });

    return {
      success: true,
      url: result.secure_url,
      format: result.format,
      size: result.bytes,
      createdAt: result.created_at,
      tags: result.tags
    };
  } catch (error) {
    console.error('❌ Error obteniendo info de archivo:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Listar archivos en una carpeta
 * @param {string} folder - Nombre de la carpeta
 * @param {number} maxResults - Máximo de resultados
 * @returns {Promise<object>} - Lista de archivos
 */
const listFiles = async (folder = 'scancvai/cvs', maxResults = 100) => {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'raw',
      prefix: folder,
      max_results: maxResults
    });

    return {
      success: true,
      files: result.resources,
      total: result.resources.length
    };
  } catch (error) {
    console.error('❌ Error listando archivos:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Verificar configuración de Cloudinary
 * @returns {boolean} - true si está configurado correctamente
 */
const isConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

/**
 * Subir buffer directamente a Cloudinary
 * @param {Buffer} buffer - Buffer del archivo
 * @param {object} options - Opciones de subida
 * @returns {Promise<object>} - Resultado de la subida
 */
const uploadBuffer = async (buffer, options = {}) => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || 'scancvai/informes',
          resource_type: options.resource_type || 'raw',
          public_id: options.public_id,
          tags: options.tags || ['informe'],
          format: options.format || 'pdf',
          ...options
        },
        (error, result) => {
          if (error) {
            console.error('❌ Error subiendo buffer a Cloudinary:', error);
            reject(error);
          } else {
            resolve({
              success: true,
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              size: result.bytes,
              createdAt: result.created_at
            });
          }
        }
      );

      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('❌ Error en uploadBuffer:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Descargar archivo de Cloudinary (obtener buffer)
 * @param {string} url - URL del archivo
 * @returns {Promise<Buffer>} - Buffer del archivo
 */
const downloadFile = async (url) => {
  try {
    const https = require('https');
    const http = require('http');
    const protocol = url.startsWith('https') ? https : http;

    return new Promise((resolve, reject) => {
      protocol.get(url, (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      });
    });
  } catch (error) {
    console.error('❌ Error descargando archivo:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  cvStorage,
  uploadFile,
  uploadBuffer,
  deleteFile,
  getSignedUrl,
  getFileInfo,
  listFiles,
  isConfigured,
  downloadFile
};
