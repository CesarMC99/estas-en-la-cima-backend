import type { UserRole } from '../../module/users/domain/user.entity.js';

/** Quién hace la petición, según su token de acceso (lo deja JwtAuthGuard) */
export interface AuthenticatedUser {
  userId: string;
  roles: UserRole[];
}

/** La petición HTTP con el usuario ya identificado */
export interface RequestWithUser {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
}
