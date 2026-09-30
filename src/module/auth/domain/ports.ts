import type { UserRole } from '../../users/domain/user.entity.js';

/*
 * Puertos (interfaces) que necesita la autenticación. Los casos de uso solo
 * conocen estas interfaces; las implementaciones concretas (Argon2, JWT,
 * Mongo) viven en infrastructure/ y se conectan en auth.module.ts.
 */

/** Convierte contraseñas en un hash irreversible y las verifica */
export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  verify(passwordHash: string, plainPassword: string): Promise<boolean>;
}

/** Lo que viaja dentro del token de acceso */
export interface AccessTokenPayload {
  userId: string;
  roles: UserRole[];
}

/** Firma y verifica los tokens de acceso de vida corta */
export interface AccessTokenIssuer {
  issue(payload: AccessTokenPayload): Promise<string>;
  /** null si el token es falso, está alterado o ya venció */
  verify(token: string): Promise<AccessTokenPayload | null>;
}

/**
 * Una sesión = un dispositivo con sesión iniciada. Guarda el HASH del token
 * de renovación, nunca el token: si alguien lee la base de datos, no puede
 * usar esos valores para entrar.
 */
export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  /** Si tiene fecha, la sesión ya no sirve (se cerró o se rotó) */
  revokedAt: Date | null;
}

export interface SessionRepository {
  create(session: Omit<Session, 'id' | 'revokedAt'>): Promise<Session>;
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  /**
   * Revoca SOLO si aún estaba activa. Devuelve false si otra petición la
   * revocó antes: así dos renovaciones simultáneas no pueden usar el mismo token.
   */
  revokeIfActive(sessionId: string): Promise<boolean>;
  revokeAllForUser(userId: string): Promise<void>;
}

/** Código de 6 dígitos para recuperar la contraseña (guardado como hash) */
export interface PasswordResetCode {
  id: string;
  userId: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
}

export interface PasswordResetRepository {
  /** Guarda el código nuevo y borra cualquier código anterior del usuario */
  replaceForUser(
    code: Omit<PasswordResetCode, 'id' | 'attempts'>,
  ): Promise<void>;
  findByUserId(userId: string): Promise<PasswordResetCode | null>;
  incrementAttempts(codeId: string): Promise<void>;
  deleteForUser(userId: string): Promise<void>;
}
