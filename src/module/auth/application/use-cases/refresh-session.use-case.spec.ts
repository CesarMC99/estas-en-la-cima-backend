import { UnauthorizedException } from '@nestjs/common';
import type { UserRepository } from '../../../users/domain/user.repository.js';
import type { Session, SessionRepository } from '../../domain/ports.js';
import { sha256 } from '../../domain/secure-random.js';
import { RefreshSessionUseCase } from './refresh-session.use-case.js';
import {
  buildUser,
  asSessionIssuer,
  fakeSessionIssuer,
  fakeSessionRepository,
  fakeUserRepository,
} from './test-helpers.js';

describe('RefreshSessionUseCase', () => {
  const activeSession = (overrides: Partial<Session> = {}): Session => ({
    id: 'session-1',
    userId: 'user-1',
    tokenHash: sha256('token-de-la-cookie'),
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    ...overrides,
  });

  function setup() {
    const sessions = fakeSessionRepository();
    const users = fakeUserRepository();
    const issuer = fakeSessionIssuer();
    const useCase = new RefreshSessionUseCase(
      sessions as unknown as SessionRepository,
      users as unknown as UserRepository,
      asSessionIssuer(issuer),
    );
    return { sessions, users, issuer, useCase };
  }

  it('rota el token: revoca la sesión usada y abre una nueva', async () => {
    const { sessions, users, issuer, useCase } = setup();
    sessions.findByTokenHash.mockResolvedValue(activeSession());
    users.findById.mockResolvedValue(buildUser());

    await useCase.execute('token-de-la-cookie');

    // Busca por el HASH, nunca por el token en claro
    expect(sessions.findByTokenHash).toHaveBeenCalledWith(
      sha256('token-de-la-cookie'),
    );
    expect(sessions.revokeIfActive).toHaveBeenCalledWith('session-1');
    expect(issuer.start).toHaveBeenCalled();
  });

  it('si el token YA se usó (posible robo), cierra todas las sesiones de la cuenta', async () => {
    const { sessions, useCase } = setup();
    sessions.findByTokenHash.mockResolvedValue(
      activeSession({ revokedAt: new Date() }),
    );

    await expect(useCase.execute('token-de-la-cookie')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith('user-1');
  });

  it('rechaza una sesión vencida', async () => {
    const { sessions, useCase } = setup();
    sessions.findByTokenHash.mockResolvedValue(
      activeSession({ expiresAt: new Date(Date.now() - 1) }),
    );

    await expect(useCase.execute('token-de-la-cookie')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('si otra petición simultánea ya rotó el token, esta pierde', async () => {
    const { sessions, issuer, useCase } = setup();
    sessions.findByTokenHash.mockResolvedValue(activeSession());
    sessions.revokeIfActive.mockResolvedValue(false);

    await expect(useCase.execute('token-de-la-cookie')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(issuer.start).not.toHaveBeenCalled();
  });

  it('sin cookie responde sesión terminada', async () => {
    const { useCase } = setup();
    await expect(useCase.execute(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
