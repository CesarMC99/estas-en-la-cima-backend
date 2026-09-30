/*
 * Reglas para correos y celulares, sin frameworks: se pueden probar solas y
 * las usan tanto el registro como el login y la recuperación.
 */

/** Los correos se comparan sin importar mayúsculas ni espacios alrededor */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Celular móvil peruano: 9 dígitos que empiezan con 9 */
const PERU_MOBILE = /^9\d{8}$/;

/**
 * "987 654 321", "+51 987654321" o "51987654321" → "+51987654321".
 * Se guarda en formato internacional (E.164) para que sea único y no dependa
 * de cómo lo escribió cada persona. Devuelve null si no es un celular válido.
 */
export function normalizePeruMobile(phone: string): string | null {
  const digits = phone.replace(/[\s-]/g, '').replace(/^\+?51(?=9\d{8}$)/, '');
  return PERU_MOBILE.test(digits) ? `+51${digits}` : null;
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginIdentifier =
  { kind: 'email'; value: string } | { kind: 'phone'; value: string };

/**
 * En el login y la recuperación la persona escribe "correo o celular".
 * Esta función decide cuál es y lo deja normalizado para buscarlo.
 */
export function parseLoginIdentifier(input: string): LoginIdentifier | null {
  const trimmed = input.trim();
  if (EMAIL_SHAPE.test(trimmed)) {
    return { kind: 'email', value: normalizeEmail(trimmed) };
  }
  const phone = normalizePeruMobile(trimmed);
  return phone ? { kind: 'phone', value: phone } : null;
}

/** "cesar@gmail.com" → "c***r@gmail.com": para decir adónde fue el código sin revelarlo */
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return '***';
  const visible =
    name.length <= 2 ? name[0] : `${name[0]}***${name[name.length - 1]}`;
  return `${visible}@${domain}`;
}
