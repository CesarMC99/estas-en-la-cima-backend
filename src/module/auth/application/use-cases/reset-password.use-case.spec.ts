import { BadRequestException } from '@nestjs/common';
import type { UserRepository } from '../../../users/domain/user.repository.js';
import type {
  PasswordHasher,
  PasswordResetCode,
  PasswordResetRepository,
  SessionRepository,
} from '../../domain/ports.js';
import {
  INVALID_CODE_MESSAGE,
  MAX_RESET_ATTEMPTS,
  ResetPasswordUseCase,
} from './reset-password.use-case.js';
import {
  buildUser,
  fakeHasher,
  fakeResetRepository,
  fakeSessionRepository,
  fakeUserRepository,
} from './test-helpers.js';

describe('ResetPasswordUseCase', () => {
  const pendingCode = (
    overrides: Partial<PasswordResetCode> = {},
  ): PasswordResetCode => ({
    id: 'code-1',
    userId: 'user-1',
    codeHash: 'hash:123456',
    expiresAt: new Date(Date.now() + 60_000),
    attempts: 0,
    ...overrides,
  });

  function setup() {
    const users = fakeUserRepository();
    const codes = fakeResetRepository();
    const sessions = fakeSessionRepository();
    const hasher = fakeHasher();
    users.findByEmail.mockResolvedValue(buildUser());
    const useCase = new ResetPasswordUseCase(
      users as unknown as UserRepository,
      codes as unknown as PasswordResetRepository,
      sessions as unknown as SessionRepository,
      hasher as unknown as PasswordHasher,
    );
    return { users, codes, sessions, useCase };
  }

  const command = {
    emailOrPhone: 'chalaco@cima.test',
    code: '123456',
    newPassword: 'nueva1234',
  };
  const invalid = new BadRequestException(INVALID_CODE_MESSAGE);

  it('con el código correcto cambia la contraseña, borra el código y cierra todas las sesiones', async () => {
    const { users, codes, sessions, useCase } = setup();
    codes.findByUserId.mockResolvedValue(pendingCode());

    await useCase.execute(command);

    expect(users.updatePasswordHash).toHaveBeenCalledWith(
      'user-1',
      'hash:nueva1234',
    );
    expect(codes.deleteForUser).toHaveBeenCalledWith('user-1');
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith('user-1');
  });

  it('con un código incorrecto no cambia nada pero cuenta el intento', async () => {
    const { users, codes, useCase } = setup();
    codes.findByUserId.mockResolvedValue(pendingCode());

    await expect(
      useCase.execute({ ...command, code: '000000' }),
    ).rejects.toThrow(invalid);
    expect(codes.incrementAttempts).toHaveBeenCalledWith('code-1');
    expect(users.updatePasswordHash).not.toHaveBeenCalled();
  });

  it(`después de ${MAX_RESET_ATTEMPTS} intentos rechaza incluso el código correcto`, async () => {
    const { codes, useCase } = setup();
    codes.findByUserId.mockResolvedValue(
      pendingCode({ attempts: MAX_RESET_ATTEMPTS }),
    );

    await expect(useCase.execute(command)).rejects.toThrow(invalid);
  });

  it('rechaza un código vencido', async () => {
    const { codes, useCase } = setup();
    codes.findByUserId.mockResolvedValue(
      pendingCode({ expiresAt: new Date(Date.now() - 1) }),
    );

    await expect(useCase.execute(command)).rejects.toThrow(invalid);
  });

  it('si la cuenta no existe responde el mismo mensaje (no revela nada)', async () => {
    const { users, useCase } = setup();
    users.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toThrow(invalid);
  });
});
