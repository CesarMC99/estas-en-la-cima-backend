import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  EMAIL_SENDER,
  PASSWORD_HASHER,
  PASSWORD_RESET_REPOSITORY,
  USER_REPOSITORY,
} from '../../../../common/constants/injection-tokens.js';
import { authConfig, type AuthConfig } from '../../../../config/index.js';
import { parseLoginIdentifier } from '../../../users/domain/contact.js';
import type { EmailSender } from '../../../notifications/domain/email-sender.js';
import type { UserRepository } from '../../../users/domain/user.repository.js';
import type {
  PasswordHasher,
  PasswordResetRepository,
} from '../../domain/ports.js';
import { generateSixDigitCode } from '../../domain/secure-random.js';
import { passwordResetEmail } from '../emails/password-reset.email.js';
import { findUserByIdentifier } from '../find-user-by-identifier.js';

/**
 * Paso 1 de la recuperación: genera un código de 6 dígitos y lo manda al
 * CORREO de la cuenta (aunque la persona haya escrito su celular: enviar SMS
 * cuesta dinero por mensaje).
 *
 * Nunca revela si la cuenta existe: responde igual en ambos casos. Si dijera
 * "no hay cuenta con ese correo", serviría para averiguar quién está registrado.
 */
@Injectable()
export class RequestPasswordResetUseCase {
  private readonly logger = new Logger(RequestPasswordResetUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_RESET_REPOSITORY)
    private readonly resetCodes: PasswordResetRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  async execute(emailOrPhone: string): Promise<void> {
    const identifier = parseLoginIdentifier(emailOrPhone);
    const user = identifier
      ? await findUserByIdentifier(this.users, identifier)
      : null;
    if (!user) return;

    const code = generateSixDigitCode();
    await this.resetCodes.replaceForUser({
      userId: user.id,
      // Solo un millón de combinaciones: se guarda con Argon2 (lento), no con SHA-256
      codeHash: await this.hasher.hash(code),
      expiresAt: new Date(
        Date.now() + this.config.passwordResetTtlMinutes * 60 * 1000,
      ),
    });

    try {
      await this.email.send({
        to: user.email,
        ...passwordResetEmail({
          username: user.username,
          code,
          ttlMinutes: this.config.passwordResetTtlMinutes,
        }),
      });
    } catch (error) {
      // El fallo del correo no se le cuenta al cliente (revelaría que la
      // cuenta existe); queda en el log para revisarlo
      this.logger.error('No se pudo enviar el código de recuperación', error);
    }
  }
}
