require('dotenv').config(); // Cargar variables de entorno
const path = require('path');
const { uploadFile } = require('../services/cloudinary.service');
const logger = require('../services/logger.service');

/**
 * Script para subir el CV de referencia a Cloudinary
 * Ejecutar con: node upload-reference-cv.js
 */

async function uploadReferenceCVToCloudinary() {
    try {
        console.log('📤 Subiendo CV de referencia a Cloudinary...');

        const referenceFilePath = path.join(__dirname, '../reference-files/CV_ejemplo.docx');

        // Subir a Cloudinary
        const result = await uploadFile(referenceFilePath, {
            folder: 'scancvai/reference',
            resource_type: 'raw',
            public_id: 'cv_ejemplo_tecsup'
        });

        if (!result.success) {
            throw new Error(result.error || 'Error desconocido al subir archivo');
        }

        console.log('✅ CV de referencia subido exitosamente!');
        console.log('📋 URL:', result.url);
        console.log('🆔 Public ID:', result.publicId);
        console.log('\n📝 Agrega esta URL a tu archivo .env:');
        console.log(`REFERENCE_CV_URL=${result.url}`);

        return result;
    } catch (error) {
        console.error('❌ Error subiendo CV de referencia:', error.message);
        throw error;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    uploadReferenceCVToCloudinary()
        .then(() => {
            console.log('\n✅ Proceso completado');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Error en el proceso:', error);
            process.exit(1);
        });
}

module.exports = { uploadReferenceCVToCloudinary };
