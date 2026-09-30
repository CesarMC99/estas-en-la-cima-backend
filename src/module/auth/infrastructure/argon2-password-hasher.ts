import argon2 from '@node-rs/argon2';
import type { PasswordHasher } from '../domain/ports.js';

/**
 * Hash de contraseñas con Argon2id, el algoritmo que hoy recomienda OWASP.
 *
 * Es lento A PROPÓSITO y usa mucha memoria (19 MiB por hash): para quien
 * inicia sesión no se nota, pero a un atacante que robara la base le haría
 * carísimo probar millones de contraseñas, incluso con tarjetas gráficas.
 * Los valores por defecto de la librería son justo los mínimos de OWASP
 * (Argon2id, 19 MiB, 2 iteraciones, 1 hilo).
 *
 * El hash incluye su propia "sal" aleatoria: dos personas con la misma
 * contraseña tienen hashes distintos.
 */
export class Argon2PasswordHasher implements PasswordHasher {
  hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword);
  }

  async verify(passwordHash: string, plainPassword: string): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, plainPassword);
    } catch {
      // Un hash corrupto o con otro formato no debe tumbar el login: es "no coincide"
      return false;
    }
  }
}
