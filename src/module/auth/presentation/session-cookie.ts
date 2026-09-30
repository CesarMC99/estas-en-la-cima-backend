import type { Request, Response } from 'express';

/** Nombre de la cookie con el token de renovación */
export const SESSION_COOKIE = 'cima_session';

/**
 * Opciones de la cookie:
 * - httpOnly: JavaScript no puede leerla (protege contra XSS).
 * - secure: en producción solo viaja por HTTPS.
 * - sameSite 'lax': el navegador no la manda en peticiones que otro sitio
 *   dispare contra nuestra API (protege contra CSRF).
 * - path '/graphql': solo viaja a la API, no a cualquier ruta del servidor.
 */
function cookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/graphql',
  };
}

export function setSessionCookie(
  res: Response,
  token: string,
  expiresAt: Date,
  isProduction: boolean,
): void {
  res.cookie(SESSION_COOKIE, token, {
    ...cookieOptions(isProduction),
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: Response, isProduction: boolean): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions(isProduction));
}

export function readSessionCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[SESSION_COOKIE];
  return typeof value === 'string' ? value : undefined;
}
