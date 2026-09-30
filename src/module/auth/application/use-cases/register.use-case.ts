import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  PASSWORD_HASHER,
  USER_REPOSITORY,
} from '../../../../common/constants/injection-tokens.js';
import {
  normalizeEmail,
  normalizePeruMobile,
} from '../../../users/domain/contact.js';
import {
  UserAlreadyExistsError,
  type UserRepository,
} from '../../../users/domain/user.repository.js';
import type { PasswordHasher } from '../../domain/ports.js';
import { type AuthResult, SessionIssuer } from '../session-issuer.js';

export interface RegisterCommand {
  username: string;
  email: string;
  phone: string;
  password: string;
}

/** Mensaje para la persona según qué dato ya estaba registrado */
const CONFLICT_MESSAGES = {
  username: 'Ese usuario ya está en uso. Prueba con otro.',
  email: 'Ya hay una cuenta con ese correo. ¿Quieres ingresar?',
  phone: 'Ya hay una cuenta con ese celular. ¿Quieres ingresar?',
} as const;

/**
 * Crear cuenta: normaliza los datos, guarda la contraseña como hash y deja la
 * sesión iniciada (nadie quiere registrarse y luego tener que ingresar).
 */
@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly sessionIssuer: SessionIssuer,
  ) {}

  async execute(command: RegisterCommand): Promise<AuthResult> {
    const phone = normalizePeruMobile(command.phone);
    // El input ya lo valida, pero el caso de uso no confía en quién lo llama
    if (!phone) {
      throw new BadRequestException(
        'Escribe un celular de 9 dígitos que empiece con 9',
      );
    }

    const passwordHash = await this.hasher.hash(command.password);

    try {
      const user = await this.users.create({
        username: command.username.trim().toLowerCase(),
        email: normalizeEmail(command.email),
        phone,
        passwordHash,
        roles: ['fan'],
      });
      return await this.sessionIssuer.start(user);
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        // `field` le dice al frontend en qué campo mostrar el mensaje
        throw new ConflictException({
          message: CONFLICT_MESSAGES[error.field],
          field: error.field,
        });
      }
      throw error;
    }
  }
}
