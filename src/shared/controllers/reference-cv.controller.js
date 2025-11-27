const path = require('path');
const fs = require('fs');
const logger = require('../logger.service');

class ReferenceCVController {
    /**
     * Obtener el CV de referencia para vista previa
     */
    static async obtenerCVReferencia(req, res) {
        try {
            const referenceFilePath = path.join(__dirname, '../reference-files/CV_ejemplo.docx');

            // Verificar que el archivo existe
            if (!fs.existsSync(referenceFilePath)) {
                return res.status(404).json({
                    error: "CV de referencia no encontrado"
                });
            }

            // Configurar headers para descarga
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', 'inline; filename="CV_ejemplo.docx"');

            // Enviar el archivo
            res.sendFile(referenceFilePath, (err) => {
                if (err) {
                    logger.error("Error enviando CV de referencia", err);
                    if (!res.headersSent) {
                        res.status(500).json({ error: "Error al obtener el CV de referencia" });
                    }
                }
            });

        } catch (error) {
            logger.error("Error obteniendo CV de referencia", error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = ReferenceCVController;
