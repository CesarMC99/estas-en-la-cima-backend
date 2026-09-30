import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../../common/constants/injection-tokens.js';
import type { User } from '../../../users/domain/user.entity.js';
import type { UserRepository } from '../../../users/domain/user.repository.js';

/** La cuenta de quien tiene la sesión (su id sale del token, nunca del cliente) */
@Injectable()
export class GetMyAccountUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    // Token válido pero cuenta borrada: se trata como sesión terminada
    if (!user)
      throw new UnauthorizedException('Tu sesión terminó. Vuelve a ingresar.');
    return user;
  }
}
