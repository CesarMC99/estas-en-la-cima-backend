/*
 * Plantilla del correo con el código de recuperación. Es una función pura
 * (datos → texto), así se puede probar y cambiar sin tocar la lógica.
 *
 * Los correos usan estilos en línea y tablas porque muchos clientes de correo
 * (Gmail, Outlook) ignoran las hojas de estilo y el CSS moderno.
 */

interface PasswordResetEmailData {
  username: string;
  code: string;
  ttlMinutes: number;
}

/** Evita que un @usuario con "<script>" se interprete como HTML en el correo */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function passwordResetEmail({
  username,
  code,
  ttlMinutes,
}: PasswordResetEmailData) {
  const safeUsername = escapeHtml(username);

  const text = [
    `Hola @${username},`,
    '',
    `Tu código para cambiar la contraseña es: ${code}`,
    `Vence en ${ttlMinutes} minutos.`,
    '',
    'Si no lo pediste, ignora este correo: tu contraseña sigue igual.',
    '',
    'Estás en la cima',
  ].join('\n');

  const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1f0d33;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#140a1f;border-radius:20px;padding:32px;color:#fff6ec;">
      <tr><td style="font-size:22px;font-weight:bold;color:#ffd400;">Estás en la cima</td></tr>
      <tr><td style="padding-top:20px;font-size:16px;">Hola @${safeUsername}, este es tu código para cambiar la contraseña:</td></tr>
      <tr><td align="center" style="padding:24px 0;font-size:40px;font-weight:bold;letter-spacing:10px;color:#ffd400;">${code}</td></tr>
      <tr><td style="font-size:14px;color:#e0d2e6;">Vence en ${ttlMinutes} minutos. Si no lo pediste, ignora este correo: tu contraseña sigue igual.</td></tr>
    </table>
  </td></tr>
</table>`.trim();

  return { subject: `Tu código: ${code}`, html, text };
}
