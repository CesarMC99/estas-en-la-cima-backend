import { createHash, randomBytes, randomInt } from 'node:crypto';

/*
 * Valores secretos aleatorios y su hash. Usa el generador criptográfico de
 * Node (crypto), NUNCA Math.random(): este último es predecible y un
 * atacante podría adivinar el siguiente token.
 */

/** Token de renovación: 48 bytes aleatorios (imposible de adivinar) */
export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

/** Código de recuperación de 6 dígitos, con ceros a la izquierda si toca */
export function generateSixDigitCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * SHA-256 del token. Para tokens LARGOS y aleatorios alcanza con un hash
 * rápido: no se pueden adivinar por fuerza bruta. Los códigos de 6 dígitos,
 * en cambio, solo tienen un millón de combinaciones: esos se guardan con
 * Argon2 (lento a propósito), como las contraseñas.
 */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
