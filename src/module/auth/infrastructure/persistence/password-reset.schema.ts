import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { type HydratedDocument } from 'mongoose';

/** Código de recuperación de contraseña pendiente (uno por usuario como máximo) */
@Schema({ collection: 'password_reset_codes', timestamps: true })
export class PasswordResetDocumentModel {
  // unique: como mucho un código activo por usuario
  @Prop({ type: mongoose.Types.ObjectId, required: true, unique: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ type: String, required: true })
  codeHash: string;

  // TTL: MongoDB borra el código solo cuando vence
  @Prop({ type: Date, required: true, expires: 0 })
  expiresAt: Date;

  @Prop({ type: Number, default: 0 })
  attempts: number;
}

export type PasswordResetDocument =
  HydratedDocument<PasswordResetDocumentModel>;
export const PasswordResetSchema = SchemaFactory.createForClass(
  PasswordResetDocumentModel,
);
