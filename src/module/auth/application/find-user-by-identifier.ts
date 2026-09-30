import type { LoginIdentifier } from '../../users/domain/contact.js';
import type { User } from '../../users/domain/user.entity.js';
import type { UserRepository } from '../../users/domain/user.repository.js';

/** Busca la cuenta por correo o por celular, según lo que escribió la persona */
export function findUserByIdentifier(
  users: UserRepository,
  identifier: LoginIdentifier,
): Promise<User | null> {
  return identifier.kind === 'email'
    ? users.findByEmail(identifier.value)
    : users.findByPhone(identifier.value);
}
