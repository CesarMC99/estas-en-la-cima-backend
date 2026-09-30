/** Roles del sistema: todos son "fan"; solo algunos son además "admin" */
export type UserRole = 'fan' | 'admin';

export interface UserProps {
  id: string;
  /** El @ público de los comentarios, siempre en minúsculas */
  username: string;
  email: string;
  /** Celular en formato internacional: +51987654321 */
  phone: string;
  passwordHash: string;
  roles: UserRole[];
  createdAt: Date;
}

/**
 * Usuario del dominio: una clase de TypeScript pura, sin Mongoose ni Nest.
 *
 * El resto del código trabaja con esta clase y no con el documento de Mongo.
 * Si mañana cambiamos de base de datos, solo cambia la capa de
 * infraestructura; las reglas de negocio no se enteran.
 */
export class User {
  constructor(private readonly props: UserProps) {}

  get id(): string {
    return this.props.id;
  }
  get username(): string {
    return this.props.username;
  }
  get email(): string {
    return this.props.email;
  }
  get phone(): string {
    return this.props.phone;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get roles(): readonly UserRole[] {
    return this.props.roles;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  isAdmin(): boolean {
    return this.props.roles.includes('admin');
  }
}

/** Datos para crear un usuario nuevo (el id y la fecha los pone la base) */
export type NewUser = Omit<UserProps, 'id' | 'createdAt'>;
