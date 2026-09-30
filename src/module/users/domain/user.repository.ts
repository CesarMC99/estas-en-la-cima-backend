import type { NewUser, User } from './user.entity.js';

/** Campo que chocó con otra cuenta al registrarse */
export type UniqueUserField = 'username' | 'email' | 'phone';

/**
 * Error de dominio: ya existe una cuenta con ese usuario, correo o celular.
 * Lo lanza el repositorio (que es quien detecta el duplicado en la base) y el
 * caso de uso lo traduce a un mensaje para la persona.
 */
export class UserAlreadyExistsError extends Error {
  constructor(readonly field: UniqueUserField) {
    super(`Ya existe un usuario con ese ${field}`);
  }
}

/**
 * Puerto (interfaz) de persistencia de usuarios. Los casos de uso dependen de
 * esto, no de Mongoose: así se prueban con un objeto falso y la base de datos
 * se puede cambiar sin tocar las reglas de negocio.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  /** @throws UserAlreadyExistsError si el usuario, correo o celular ya existen */
  create(user: NewUser): Promise<User>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
}
