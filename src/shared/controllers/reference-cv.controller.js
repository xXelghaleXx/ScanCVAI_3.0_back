const logger = require('../services/logger.service');

class ReferenceCVController {
    /**
     * Obtener el CV de referencia para vista previa
     * Redirige a la URL de Cloudinary donde está almacenado el CV de referencia
     */
    static async obtenerCVReferencia(req, res) {
        try {
            // URL del CV de referencia en Cloudinary
            // Esta URL debe estar configurada en las variables de entorno
            const referenceCVUrl = process.env.REFERENCE_CV_URL;

            if (!referenceCVUrl) {
                logger.error("REFERENCE_CV_URL no está configurada en las variables de entorno");
                return res.status(500).json({
                    error: "CV de referencia no disponible. Contacte al administrador."
                });
            }

            // Redirigir a la URL de Cloudinary
            logger.info(`Redirigiendo a CV de referencia: ${referenceCVUrl}`);
            res.redirect(referenceCVUrl);

        } catch (error) {
            logger.error("Error obteniendo CV de referencia", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = ReferenceCVController;
