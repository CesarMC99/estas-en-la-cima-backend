import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  PASSWORD_HASHER,
  USER_REPOSITORY,
} from '../../../../common/constants/injection-tokens.js';
import { parseLoginIdentifier } from '../../../users/domain/contact.js';
import type { UserRepository } from '../../../users/domain/user.repository.js';
import type { PasswordHasher } from '../../domain/ports.js';
import { type AuthResult, SessionIssuer } from '../session-issuer.js';
import { findUserByIdentifier } from '../find-user-by-identifier.js';

/*
 * Un solo mensaje para "no existe" y "contraseña mal": si fueran distintos,
 * un atacante podría averiguar qué correos tienen cuenta (enumeración).
 */
export const INVALID_CREDENTIALS_MESSAGE =
  'Correo, celular o contraseña incorrectos';

export interface LoginCommand {
  emailOrPhone: string;
  password: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly sessionIssuer: SessionIssuer,
  ) {}

  async execute(command: LoginCommand): Promise<AuthResult> {
    const identifier = parseLoginIdentifier(command.emailOrPhone);
    const user = identifier
      ? await findUserByIdentifier(this.users, identifier)
      : null;

    if (!user) {
      /*
       * Aunque el usuario no exista, se calcula un hash igual de lento. Si
       * no, responder "no existe" tardaría milisegundos y "clave incorrecta"
       * medio segundo: midiendo el tiempo se sabría qué cuentas existen.
       */
      await this.hasher.hash(command.password);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const valid = await this.hasher.verify(user.passwordHash, command.password);
    if (!valid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return this.sessionIssuer.start(user);
  }
}
