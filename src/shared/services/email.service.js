// src/shared/services/email.service.js
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Configuración del transporter
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // Usar App Password de Gmail
      }
    });
  }

  /**
   * Enviar email de recuperación de contraseña
   */
  async enviarEmailRecuperacion(email, token) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

      const mailOptions = {
        from: `"ScanCVAI - Tecsup" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Recuperación de Contraseña - ScanCVAI',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background-color: #f8f9fa;
                border-radius: 10px;
                padding: 30px;
              }
              .header {
                background-color: #2b7de9;
                color: white;
                padding: 20px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background-color: white;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .button {
                display: inline-block;
                background-color: #2b7de9;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                font-size: 12px;
                color: #6b7280;
              }
              .warning {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>ScanCVAI - Tecsup</h1>
              </div>
              <div class="content">
                <h2>Recuperación de Contraseña</h2>
                <p>Hola,</p>
                <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
                <p>Para crear una nueva contraseña, haz clic en el siguiente botón:</p>

                <center>
                  <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
                </center>

                <p>O copia y pega este enlace en tu navegador:</p>
                <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all;">
                  ${resetUrl}
                </p>

                <div class="warning">
                  <strong>⚠️ Importante:</strong>
                  <ul>
                    <li>Este enlace expirará en <strong>1 hora</strong></li>
                    <li>Si no solicitaste este cambio, ignora este correo</li>
                    <li>Tu contraseña actual seguirá siendo válida</li>
                  </ul>
                </div>

                <p>Si tienes algún problema, contacta al administrador del sistema.</p>

                <p>Saludos,<br>
                <strong>Equipo ScanCVAI - Tecsup</strong></p>
              </div>
              <div class="footer">
                <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
                <p>&copy; ${new Date().getFullYear()} Tecsup - Todos los derechos reservados</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email de recuperación enviado:', info.messageId);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error('❌ Error al enviar email de recuperación:', error);
      throw new Error('Error al enviar el correo de recuperación');
    }
  }

  /**
   * Enviar email de confirmación de cambio de contraseña
   */
  async enviarConfirmacionCambioPassword(email, nombre) {
    try {
      const mailOptions = {
        from: `"ScanCVAI - Tecsup" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Contraseña Actualizada - ScanCVAI',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background-color: #f8f9fa;
                border-radius: 10px;
                padding: 30px;
              }
              .header {
                background-color: #10b981;
                color: white;
                padding: 20px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background-color: white;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .success-icon {
                font-size: 48px;
                text-align: center;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                font-size: 12px;
                color: #6b7280;
              }
              .alert {
                background-color: #fef2f2;
                border-left: 4px solid #dc2626;
                padding: 15px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>ScanCVAI - Tecsup</h1>
              </div>
              <div class="content">
                <div class="success-icon">✅</div>
                <h2 style="text-align: center;">Contraseña Actualizada</h2>
                <p>Hola ${nombre || ''},</p>
                <p>Te confirmamos que tu contraseña ha sido actualizada exitosamente.</p>
                <p>Ya puedes iniciar sesión con tu nueva contraseña.</p>

                <div class="alert">
                  <strong>⚠️ ¿No fuiste tú?</strong>
                  <p>Si no realizaste este cambio, contacta inmediatamente al administrador del sistema para asegurar tu cuenta.</p>
                </div>

                <p>Saludos,<br>
                <strong>Equipo ScanCVAI - Tecsup</strong></p>
              </div>
              <div class="footer">
                <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
                <p>&copy; ${new Date().getFullYear()} Tecsup - Todos los derechos reservados</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email de confirmación enviado:', info.messageId);
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error('❌ Error al enviar email de confirmación:', error);
      // No lanzar error aquí, ya que el cambio de contraseña fue exitoso
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();