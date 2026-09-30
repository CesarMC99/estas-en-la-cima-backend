import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import type { UserRole } from '../../domain/user.entity.js';

/**
 * Forma del usuario en MongoDB. Es un detalle de infraestructura: fuera de
 * esta carpeta nadie usa esta clase, solo la entidad `User` del dominio.
 *
 * timestamps: Mongoose llena createdAt y updatedAt automáticamente.
 */
@Schema({ collection: 'users', timestamps: true })
export class UserDocumentModel {
  // unique crea un índice único en MongoDB: aunque dos registros lleguen al
  // mismo tiempo, la BASE garantiza que no haya duplicados (una comprobación
  // previa en el código no alcanzaría ante peticiones simultáneas)
  @Prop({ type: String, required: true, unique: true })
  username: string;

  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String, required: true, unique: true })
  phone: string;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @Prop({ type: [String], default: ['fan'] })
  roles: UserRole[];

  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<UserDocumentModel>;
export const UserSchema = SchemaFactory.createForClass(UserDocumentModel);
