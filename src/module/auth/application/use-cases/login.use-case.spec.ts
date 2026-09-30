import { UnauthorizedException } from '@nestjs/common';
import type { UserRepository } from '../../../users/domain/user.repository.js';
import type { PasswordHasher } from '../../domain/ports.js';
import { INVALID_CREDENTIALS_MESSAGE, LoginUseCase } from './login.use-case.js';
import {
  buildUser,
  fakeHasher,
  asSessionIssuer,
  fakeSessionIssuer,
  fakeUserRepository,
} from './test-helpers.js';

describe('LoginUseCase', () => {
  function setup() {
    const users = fakeUserRepository();
    const hasher = fakeHasher();
    const issuer = fakeSessionIssuer();
    const useCase = new LoginUseCase(
      users as unknown as UserRepository,
      hasher as unknown as PasswordHasher,
      asSessionIssuer(issuer),
    );
    return { users, hasher, issuer, useCase };
  }

  it('inicia sesión con correo y contraseña correctos', async () => {
    const { users, useCase } = setup();
    users.findByEmail.mockResolvedValue(
      buildUser({ passwordHash: 'hash:clave1234' }),
    );

    const result = await useCase.execute({
      emailOrPhone: 'CHALACO@cima.test',
      password: 'clave1234',
    });

    expect(users.findByEmail).toHaveBeenCalledWith('chalaco@cima.test');
    expect(result.accessToken).toBe('access-token');
  });

  it('inicia sesión con celular escrito con espacios', async () => {
    const { users, useCase } = setup();
    users.findByPhone.mockResolvedValue(
      buildUser({ passwordHash: 'hash:clave1234' }),
    );

    await useCase.execute({
      emailOrPhone: '987 654 321',
      password: 'clave1234',
    });

    expect(users.findByPhone).toHaveBeenCalledWith('+51987654321');
  });

  it('con contraseña incorrecta responde el mensaje genérico', async () => {
    const { users, useCase } = setup();
    users.findByEmail.mockResolvedValue(
      buildUser({ passwordHash: 'hash:clave1234' }),
    );

    await expect(
      useCase.execute({ emailOrPhone: 'chalaco@cima.test', password: 'otra' }),
    ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE));
  });

  it('si la cuenta no existe responde EL MISMO mensaje y calcula un hash igual (mismo tiempo)', async () => {
    const { hasher, useCase } = setup();

    await expect(
      useCase.execute({
        emailOrPhone: 'nadie@cima.test',
        password: 'clave1234',
      }),
    ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE));
    expect(hasher.hash).toHaveBeenCalledWith('clave1234');
  });
});
