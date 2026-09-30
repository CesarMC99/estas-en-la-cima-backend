import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '../../users/domain/user.entity.js';
import type { AccessTokenIssuer, AccessTokenPayload } from '../domain/ports.js';

/** Lo que va dentro del JWT: `sub` (subject) es el nombre estándar del id */
interface JwtClaims {
  sub: string;
  roles: UserRole[];
}

/**
 * Tokens de acceso como JWT firmados (HS256). El servidor no guarda nada: al
 * recibir un token verifica la firma y la fecha de vencimiento. Por eso duran
 * poco (15 min): un JWT no se puede "revocar" antes de que venza.
 *
 * El secreto y la duración se configuran en JwtModule (auth.module.ts).
 */
@Injectable()
export class JwtAccessTokenIssuer implements AccessTokenIssuer {
  constructor(private readonly jwt: JwtService) {}

  issue(payload: AccessTokenPayload): Promise<string> {
    const claims: JwtClaims = { sub: payload.userId, roles: payload.roles };
    return this.jwt.signAsync(claims);
  }

  async verify(token: string): Promise<AccessTokenPayload | null> {
    try {
      const claims = await this.jwt.verifyAsync<JwtClaims>(token);
      return { userId: claims.sub, roles: claims.roles };
    } catch {
      // Firma inválida, token alterado o vencido: para nosotros es "sin sesión"
      return null;
    }
  }
}
