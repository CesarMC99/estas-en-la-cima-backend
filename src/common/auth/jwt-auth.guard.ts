import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { AccessTokenIssuer } from '../../module/auth/domain/ports.js';
import { ACCESS_TOKEN_ISSUER } from '../constants/injection-tokens.js';
import type { RequestWithUser } from './authenticated-user.js';

/**
 * Protege un resolver: solo deja pasar si la petición trae un token de
 * acceso válido en la cabecera `Authorization: Bearer <token>`.
 *
 * Si es válido, deja al usuario en `req.user` para que el resolver lo lea
 * con @CurrentUser(). Si no, responde UNAUTHENTICATED y el frontend sabe que
 * debe renovar la sesión.
 *
 * Es un guard propio (sin Passport): son pocas líneas y se ve exactamente
 * qué se verifica.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(ACCESS_TOKEN_ISSUER) private readonly tokens: AccessTokenIssuer,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = GqlExecutionContext.create(context).getContext<{
      req: RequestWithUser;
    }>().req;

    const header = req.headers.authorization;
    const token =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice(7)
        : null;
    if (!token) throw new UnauthorizedException('Necesitas iniciar sesión');

    const payload = await this.tokens.verify(token);
    if (!payload) throw new UnauthorizedException('Tu sesión venció');

    req.user = payload;
    return true;
  }
}
