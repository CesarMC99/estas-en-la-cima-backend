import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

/*
 * Datos de entrada de las mutaciones de cuenta. Cada clase es a la vez:
 * - un @InputType de GraphQL (define el esquema), y
 * - un DTO con reglas de class-validator (el ValidationPipe global las
 *   aplica ANTES de llegar al resolver).
 *
 * Las reglas reflejan las del frontend (zod), pero estas son las que mandan:
 * cualquiera puede saltarse el frontend y llamar a la API directo.
 */

const PASSWORD_MIN = 8;
// Argon2 acepta contraseñas largas, pero un tope evita que alguien mande
// megabytes para hacer trabajar de más al servidor
const PASSWORD_MAX = 128;

/** Quita espacios alrededor antes de validar */
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

@InputType()
export class RegisterInput {
  @Field()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @Length(3, 20, { message: 'El usuario debe tener entre 3 y 20 caracteres' })
  @Matches(/^[a-z0-9_]+$/, {
    message: 'El usuario solo puede tener letras, números y guion bajo',
  })
  username: string;

  @Field()
  @Transform(trim)
  @IsEmail({}, { message: 'Escribe un correo válido' })
  @MaxLength(254, { message: 'El correo es demasiado largo' })
  email: string;

  @Field({ description: 'Celular peruano de 9 dígitos (con o sin +51)' })
  @Transform(trim)
  @Matches(/^(\+?51)?\s?9[\d\s-]{8,11}$/, {
    message: 'Escribe un celular de 9 dígitos que empiece con 9',
  })
  phone: string;

  @Field()
  @IsString()
  @Length(PASSWORD_MIN, PASSWORD_MAX, {
    message: `La contraseña debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres`,
  })
  password: string;
}

@InputType()
export class LoginInput {
  @Field({ description: 'Correo o celular' })
  @Transform(trim)
  @Length(1, 254, { message: 'Escribe tu correo o celular' })
  emailOrPhone: string;

  // Sin mínimo: una contraseña corta simplemente será incorrecta (exigir un
  // mínimo aquí le daría pistas a un atacante sobre las reglas)
  @Field()
  @IsString()
  @Length(1, PASSWORD_MAX, { message: 'Escribe tu contraseña' })
  password: string;
}

@InputType()
export class RequestPasswordResetInput {
  @Field({ description: 'Correo o celular de la cuenta' })
  @Transform(trim)
  @Length(1, 254, { message: 'Escribe tu correo o celular' })
  emailOrPhone: string;
}

@InputType()
export class ResetPasswordInput {
  @Field()
  @Transform(trim)
  @Length(1, 254, { message: 'Escribe tu correo o celular' })
  emailOrPhone: string;

  @Field({ description: 'Código de 6 dígitos que llegó al correo' })
  @Transform(trim)
  @Matches(/^\d{6}$/, { message: 'El código tiene 6 dígitos' })
  code: string;

  @Field()
  @IsString()
  @Length(PASSWORD_MIN, PASSWORD_MAX, {
    message: `La contraseña debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres`,
  })
  newPassword: string;
}
