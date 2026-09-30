/**
 * Puerto para enviar correos. Lo usan la recuperación de contraseña y, más
 * adelante, los comprobantes de donación. Ninguno sabe si por dentro es
 * Resend, otro proveedor o el log de desarrollo.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
