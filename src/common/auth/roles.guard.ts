import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { UserRole } from '../../module/users/domain/user.entity.js';
import type { RequestWithUser } from './authenticated-user.js';

const ROLES_KEY = 'roles';

/** @Roles('admin'): marca un resolver como exclusivo de esos roles */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Revisa que el usuario tenga alguno de los roles pedidos con @Roles(...).
 * Va DESPUÉS de JwtAuthGuard: @UseGuards(JwtAuthGuard, RolesGuard).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const user = GqlExecutionContext.create(context).getContext<{
      req: RequestWithUser;
    }>().req.user;
    if (!user || !required.some((role) => user.roles.includes(role))) {
      throw new ForbiddenException('No tienes permiso para hacer esto');
    }
    return true;
  }
}
