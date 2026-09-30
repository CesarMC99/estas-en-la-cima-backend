import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  SESSION_REPOSITORY,
  USER_REPOSITORY,
} from '../../../../common/constants/injection-tokens.js';
import type { UserRepository } from '../../../users/domain/user.repository.js';
import type { SessionRepository } from '../../domain/ports.js';
import { sha256 } from '../../domain/secure-random.js';
import { type AuthResult, SessionIssuer } from '../session-issuer.js';

const SESSION_EXPIRED_MESSAGE = 'Tu sesión terminó. Vuelve a ingresar.';

/**
 * Renovar la sesión con el token de la cookie ("rotación"): el token usado se
 * revoca y se entrega uno nuevo. Cada token sirve UNA sola vez.
 *
 * Detección de robo: si llega un token que YA fue usado, significa que dos
 * personas tienen copia (el dueño y un ladrón). Como no sabemos cuál es cuál,
 * se cierran TODAS las sesiones de esa cuenta.
 */
@Injectable()
export class RefreshSessionUseCase {
  private readonly logger = new Logger(RefreshSessionUseCase.name);

  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly sessionIssuer: SessionIssuer,
  ) {}

  async execute(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) throw new UnauthorizedException(SESSION_EXPIRED_MESSAGE);

    const session = await this.sessions.findByTokenHash(sha256(refreshToken));
    if (!session) throw new UnauthorizedException(SESSION_EXPIRED_MESSAGE);

    if (session.revokedAt) {
      this.logger.warn(
        `Token de renovación reutilizado: se cierran las sesiones de ${session.userId}`,
      );
      await this.sessions.revokeAllForUser(session.userId);
      throw new UnauthorizedException(SESSION_EXPIRED_MESSAGE);
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException(SESSION_EXPIRED_MESSAGE);
    }

    // Si otra petición simultánea ganó la carrera y ya la revocó, esta pierde
    const revoked = await this.sessions.revokeIfActive(session.id);
    if (!revoked) throw new UnauthorizedException(SESSION_EXPIRED_MESSAGE);

    const user = await this.users.findById(session.userId);
    if (!user) throw new UnauthorizedException(SESSION_EXPIRED_MESSAGE);

    return this.sessionIssuer.start(user);
  }
}
