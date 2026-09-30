import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type {
  AuthenticatedUser,
  RequestWithUser,
} from './authenticated-user.js';

/**
 * @CurrentUser() en un parámetro del resolver entrega el usuario que dejó
 * JwtAuthGuard. Siempre va junto con @UseGuards(JwtAuthGuard).
 *
 * Así el id del usuario sale del TOKEN y nunca de un argumento que el
 * cliente podría falsificar ("dame los datos del usuario 123").
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const req = GqlExecutionContext.create(context).getContext<{
      req: RequestWithUser;
    }>().req;
    if (!req.user) {
      throw new Error('@CurrentUser() se usó en un resolver sin JwtAuthGuard');
    }
    return req.user;
  },
);
