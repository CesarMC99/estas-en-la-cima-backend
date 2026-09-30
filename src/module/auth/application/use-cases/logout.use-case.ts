import { Inject, Injectable } from '@nestjs/common';
import { SESSION_REPOSITORY } from '../../../../common/constants/injection-tokens.js';
import type { SessionRepository } from '../../domain/ports.js';
import { sha256 } from '../../domain/secure-random.js';

/**
 * Cerrar sesión en ESTE dispositivo: revoca el token de la cookie.
 * Si no hay token o ya no existe, no es un error: el resultado buscado
 * (quedar sin sesión) ya se cumple.
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
  ) {}

  async execute(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const session = await this.sessions.findByTokenHash(sha256(refreshToken));
    if (session) await this.sessions.revokeIfActive(session.id);
  }
}
