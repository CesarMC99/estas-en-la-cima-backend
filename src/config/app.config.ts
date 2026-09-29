import { registerAs } from '@nestjs/config';

/**
 * Configuración general de la aplicación.
 *
 * `registerAs` la deja "con espacio de nombres" (app.*) y tipada: quien la
 * necesite la inyecta con `@Inject(appConfig.KEY)` en vez de leer
 * process.env suelto por el código. Así los valores por defecto viven en un
 * solo lugar y en los tests se puede pasar una config falsa.
 */
export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3100', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  // Origen del frontend permitido por CORS (necesario para enviar cookies)
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:4100',
}));

export type AppConfig = ReturnType<typeof appConfig>;
