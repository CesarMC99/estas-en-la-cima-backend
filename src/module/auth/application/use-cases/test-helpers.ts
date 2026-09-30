import { vi } from 'vitest';
import { User, type UserProps } from '../../../users/domain/user.entity.js';
import type { UserRepository } from '../../../users/domain/user.repository.js';
import type {
  PasswordHasher,
  PasswordResetRepository,
  SessionRepository,
} from '../../domain/ports.js';
import type { AuthResult, SessionIssuer } from '../session-issuer.js';

/*
 * Piezas falsas para probar los casos de uso SIN base de datos ni Nest: como
 * los casos de uso dependen de interfaces, se les pasa un objeto que cumple
 * la interfaz y se controla qué responde cada método.
 */

export function buildUser(overrides: Partial<UserProps> = {}): User {
  return new User({
    id: 'user-1',
    username: 'chalaco',
    email: 'chalaco@cima.test',
    phone: '+51987654321',
    passwordHash: 'hash-de-la-clave',
    roles: ['fan'],
    createdAt: new Date('2026-01-01'),
    ...overrides,
  });
}

export function fakeUserRepository(): {
  [K in keyof UserRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(null),
    findByPhone: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    updatePasswordHash: vi.fn().mockResolvedValue(undefined),
  };
}

/** Hasher falso: el "hash" de x es "hash:x", así se verifica sin Argon2 (que es lento) */
export function fakeHasher(): {
  [K in keyof PasswordHasher]: ReturnType<typeof vi.fn>;
} {
  return {
    hash: vi.fn((plain: string) => Promise.resolve(`hash:${plain}`)),
    verify: vi.fn((hash: string, plain: string) =>
      Promise.resolve(hash === `hash:${plain}`),
    ),
  };
}

export function fakeSessionRepository(): {
  [K in keyof SessionRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    create: vi.fn(),
    findByTokenHash: vi.fn().mockResolvedValue(null),
    revokeIfActive: vi.fn().mockResolvedValue(true),
    revokeAllForUser: vi.fn().mockResolvedValue(undefined),
  };
}

export function fakeResetRepository(): {
  [K in keyof PasswordResetRepository]: ReturnType<typeof vi.fn>;
} {
  return {
    replaceForUser: vi.fn().mockResolvedValue(undefined),
    findByUserId: vi.fn().mockResolvedValue(null),
    incrementAttempts: vi.fn().mockResolvedValue(undefined),
    deleteForUser: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * SessionIssuer falso: devuelve tokens fijos para el usuario que recibe.
 * Se tipa como objeto con una función simulada (no como la clase) para poder
 * revisar sus llamadas con expect(); al caso de uso se le pasa con asSessionIssuer.
 */
export function fakeSessionIssuer(): { start: ReturnType<typeof vi.fn> } {
  return {
    start: vi.fn((user: User): Promise<AuthResult> =>
      Promise.resolve({
        user,
        accessToken: 'access-token',
        accessTokenExpiresIn: 900,
        refreshToken: 'refresh-token',
        refreshTokenExpiresAt: new Date('2030-01-01'),
      }),
    ),
  };
}

export function asSessionIssuer(fake: {
  start: ReturnType<typeof vi.fn>;
}): SessionIssuer {
  return fake as unknown as SessionIssuer;
}
