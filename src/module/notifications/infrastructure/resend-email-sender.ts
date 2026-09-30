import { Resend } from 'resend';
import type { EmailMessage, EmailSender } from '../domain/email-sender.js';

/** Envío real de correos con Resend (https://resend.com) */
export class ResendEmailSender implements EmailSender {
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.client = new Resend(apiKey);
  }

  async send(message: EmailMessage): Promise<void> {
    // Resend no lanza excepción si falla: devuelve { error }. Se convierte en
    // excepción para que quien llama se entere igual que con cualquier fallo
    const { error } = await this.client.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (error) throw new Error(`Resend: ${error.message}`);
  }
}
