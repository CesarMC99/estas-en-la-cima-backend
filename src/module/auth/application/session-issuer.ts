import { Inject, Injectable } from '@nestjs/common';
import {
  ACCESS_TOKEN_ISSUER,
  SESSION_REPOSITORY,
} from '../../../common/constants/injection-tokens.js';
import { authConfig, type AuthConfig } from '../../../config/index.js';
import type { User } from '../../users/domain/user.entity.js';
import type { AccessTokenIssuer, SessionRepository } from '../domain/ports.js';
import { generateRefreshToken, sha256 } from '../domain/secure-random.js';

/** Resultado de iniciar sesión: el usuario y sus dos tokens */
export interface AuthResult {
  user: User;
  accessToken: string;
  /** Segundos de vida del token de acceso (el frontend renueva antes) */
  accessTokenExpiresIn: number;
  /** Va SOLO en la cookie httpOnly; nunca en la respuesta GraphQL */
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

/**
 * Crea una sesión nueva para un usuario. Lo usan el registro, el login y la
 * renovación: los tres terminan igual ("dale tokens a este usuario"), así que
 * esa lógica vive aquí una sola vez.
 */
@Injectable()
export class SessionIssuer {
  constructor(
    @Inject(ACCESS_TOKEN_ISSUER)
    private readonly accessTokens: AccessTokenIssuer,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  async start(user: User): Promise<AuthResult> {
    const refreshToken = generateRefreshToken();
    const refreshTokenExpiresAt = new Date(
      Date.now() + this.config.refreshTtlDays * 24 * 60 * 60 * 1000,
    );

    await this.sessions.create({
      userId: user.id,
      // Se guarda el hash: el token real solo lo tiene el navegador
      tokenHash: sha256(refreshToken),
      expiresAt: refreshTokenExpiresAt,
    });

    const accessToken = await this.accessTokens.issue({
      userId: user.id,
      roles: [...user.roles],
    });

    return {
      user,
      accessToken,
      accessTokenExpiresIn: this.config.accessTtlSeconds,
      refreshToken,
      refreshTokenExpiresAt,
    };
  }
}
