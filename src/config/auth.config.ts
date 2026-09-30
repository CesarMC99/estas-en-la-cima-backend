import { registerAs } from '@nestjs/config';

/**
 * Configuración de la sesión.
 *
 * El secreto del token de acceso es OBLIGATORIO: si falta, la app no arranca.
 * Es preferible fallar al iniciar que firmar tokens con un secreto por defecto
 * que cualquiera podría adivinar y así fabricar sesiones falsas.
 */
export const authConfig = registerAs('auth', () => {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  if (!accessSecret || accessSecret.length < 32) {
    throw new Error(
      'Falta JWT_ACCESS_SECRET en el .env (mínimo 32 caracteres)',
    );
  }

  return {
    accessSecret,
    // Vida corta: si alguien roba un token de acceso, le sirve pocos minutos
    accessTtlSeconds: parseInt(process.env.JWT_ACCESS_TTL_SECONDS ?? '900', 10),
    // Vida de la sesión (token de renovación en cookie)
    refreshTtlDays: parseInt(process.env.REFRESH_TTL_DAYS ?? '30', 10),
    // Vida del código de recuperación de contraseña
    passwordResetTtlMinutes: 10,
  };
});

export type AuthConfig = ReturnType<typeof authConfig>;
