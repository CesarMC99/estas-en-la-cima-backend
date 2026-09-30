import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  PASSWORD_HASHER,
  PASSWORD_RESET_REPOSITORY,
  SESSION_REPOSITORY,
  USER_REPOSITORY,
} from '../../../../common/constants/injection-tokens.js';
import { parseLoginIdentifier } from '../../../users/domain/contact.js';
import type { UserRepository } from '../../../users/domain/user.repository.js';
import type {
  PasswordHasher,
  PasswordResetRepository,
  SessionRepository,
} from '../../domain/ports.js';
import { findUserByIdentifier } from '../find-user-by-identifier.js';

/** Intentos permitidos por código: 5 intentos de 1 millón = imposible adivinarlo */
export const MAX_RESET_ATTEMPTS = 5;

export const INVALID_CODE_MESSAGE =
  'El código no es válido o ya venció. Pide uno nuevo.';

export interface ResetPasswordCommand {
  emailOrPhone: string;
  code: string;
  newPassword: string;
}

/**
 * Paso 2 de la recuperación: si el código es correcto, cambia la contraseña,
 * borra el código (sirve una sola vez) y cierra todas las sesiones abiertas:
 * si alguien más tenía la cuenta, queda afuera.
 */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_RESET_REPOSITORY)
    private readonly resetCodes: PasswordResetRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    const identifier = parseLoginIdentifier(command.emailOrPhone);
    const user = identifier
      ? await findUserByIdentifier(this.users, identifier)
      : null;
    // Mismo mensaje para todo: no se revela si la cuenta existe ni qué falló
    if (!user) throw new BadRequestException(INVALID_CODE_MESSAGE);

    const resetCode = await this.resetCodes.findByUserId(user.id);
    if (
      !resetCode ||
      resetCode.expiresAt.getTime() <= Date.now() ||
      resetCode.attempts >= MAX_RESET_ATTEMPTS
    ) {
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    // Se cuenta el intento ANTES de verificar: aunque se envíen muchos a la
    // vez, ninguno se salta el límite
    await this.resetCodes.incrementAttempts(resetCode.id);
    const valid = await this.hasher.verify(resetCode.codeHash, command.code);
    if (!valid) throw new BadRequestException(INVALID_CODE_MESSAGE);

    await this.users.updatePasswordHash(
      user.id,
      await this.hasher.hash(command.newPassword),
    );
    await this.resetCodes.deleteForUser(user.id);
    await this.sessions.revokeAllForUser(user.id);
  }
}
