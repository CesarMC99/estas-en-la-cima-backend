import { Logger } from '@nestjs/common';
import type { EmailMessage, EmailSender } from '../domain/email-sender.js';

/**
 * "Envía" correos escribiéndolos en el log del servidor. Se usa cuando no hay
 * RESEND_API_KEY: permite probar la recuperación de contraseña en local
 * leyendo el código en la terminal del backend.
 */
export class LogEmailSender implements EmailSender {
  private readonly logger = new Logger('Correo (sin enviar)');

  send(message: EmailMessage): Promise<void> {
    this.logger.log(
      `Para: ${message.to} | Asunto: ${message.subject}\n${message.text}`,
    );
    return Promise.resolve();
  }
}
