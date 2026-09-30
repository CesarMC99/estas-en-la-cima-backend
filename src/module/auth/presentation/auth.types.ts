import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import type { User } from '../../users/domain/user.entity.js';

/**
 * La cuenta de quien tiene la sesión iniciada. Incluye correo y celular
 * porque solo la ve su dueño; en los comentarios públicos se mostrará otro
 * tipo con únicamente el @usuario.
 *
 * El hash de la contraseña NO está aquí: si no se declara con @Field, no
 * existe en el esquema y es imposible pedirlo por error.
 */
@ObjectType('Account')
export class AccountType {
  @Field(() => ID)
  id: string;

  @Field()
  username: string;

  @Field()
  email: string;

  @Field({ description: 'Formato internacional: +51987654321' })
  phone: string;

  @Field(() => [String], { description: 'fan o admin' })
  roles: string[];

  @Field()
  createdAt: Date;
}

/**
 * Respuesta al iniciar sesión, registrarse o renovar. El token de renovación
 * NO aparece: viaja solo en la cookie httpOnly, fuera del alcance de
 * JavaScript (si hubiera un ataque XSS, no podría robarlo).
 */
@ObjectType()
export class AuthPayload {
  @Field({
    description: 'Token de acceso: va en la cabecera Authorization: Bearer',
  })
  accessToken: string;

  @Field(() => Int, { description: 'Segundos que dura el token de acceso' })
  accessTokenExpiresIn: number;

  @Field(() => AccountType)
  account: AccountType;
}

/** Entidad del dominio → tipo GraphQL */
export function toAccountType(user: User): AccountType {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    roles: [...user.roles],
    createdAt: user.createdAt,
  };
}
