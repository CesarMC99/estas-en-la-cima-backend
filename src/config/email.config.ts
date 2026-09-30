import { registerAs } from '@nestjs/config';

/**
 * Envío de correos (Resend). Si no hay API key, los correos no se envían:
 * se escriben en el log del servidor. Así se puede desarrollar y probar la
 * recuperación de contraseña sin configurar nada.
 */
export const emailConfig = registerAs('email', () => ({
  resendApiKey: process.env.RESEND_API_KEY ?? null,
  // Sin dominio verificado en Resend solo sirve onboarding@resend.dev
  from: process.env.EMAIL_FROM ?? 'Estás en la cima <onboarding@resend.dev>',
}));

export type EmailConfig = ReturnType<typeof emailConfig>;
