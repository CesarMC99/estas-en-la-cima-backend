/*
 * Tokens de inyección para los "puertos" (interfaces) del dominio.
 *
 * Una interfaz de TypeScript desaparece al compilar, así que Nest no puede
 * usarla para saber qué inyectar. Estos Symbols hacen de "nombre" de cada
 * interfaz: el caso de uso pide USER_REPOSITORY y el módulo decide qué
 * implementación real le entrega (Mongo hoy, otra mañana, un mock en tests).
 */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');
export const PASSWORD_RESET_REPOSITORY = Symbol('PASSWORD_RESET_REPOSITORY');
export const ACCESS_TOKEN_ISSUER = Symbol('ACCESS_TOKEN_ISSUER');
export const EMAIL_SENDER = Symbol('EMAIL_SENDER');
