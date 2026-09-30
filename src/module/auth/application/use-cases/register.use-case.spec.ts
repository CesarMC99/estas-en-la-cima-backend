import { ConflictException } from '@nestjs/common';
import {
  UserAlreadyExistsError,
  type UserRepository,
} from '../../../users/domain/user.repository.js';
import type { PasswordHasher } from '../../domain/ports.js';
import { RegisterUseCase } from './register.use-case.js';
import {
  buildUser,
  fakeHasher,
  asSessionIssuer,
  fakeSessionIssuer,
  fakeUserRepository,
} from './test-helpers.js';

describe('RegisterUseCase', () => {
  function setup() {
    const users = fakeUserRepository();
    const useCase = new RegisterUseCase(
      users as unknown as UserRepository,
      fakeHasher() as unknown as PasswordHasher,
      asSessionIssuer(fakeSessionIssuer()),
    );
    return { users, useCase };
  }

  const command = {
    username: 'Chalaco_De_Ley',
    email: ' Chalaco@Cima.test ',
    phone: '987 654 321',
    password: 'clave1234',
  };

  it('normaliza los datos y guarda la contraseña como hash (nunca en claro)', async () => {
    const { users, useCase } = setup();
    users.create.mockResolvedValue(buildUser());

    await useCase.execute(command);

    expect(users.create).toHaveBeenCalledWith({
      username: 'chalaco_de_ley',
      email: 'chalaco@cima.test',
      phone: '+51987654321',
      passwordHash: 'hash:clave1234',
      roles: ['fan'],
    });
  });

  it.each([
    ['username', 'Ese usuario ya está en uso. Prueba con otro.'],
    ['email', 'Ya hay una cuenta con ese correo. ¿Quieres ingresar?'],
    ['phone', 'Ya hay una cuenta con ese celular. ¿Quieres ingresar?'],
  ] as const)(
    'si el %s ya existe responde CONFLICT con un mensaje claro y el campo',
    async (field, message) => {
      const { users, useCase } = setup();
      users.create.mockRejectedValue(new UserAlreadyExistsError(field));

      const error = await useCase.execute(command).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toEqual({
        message,
        field,
      });
    },
  );
});
