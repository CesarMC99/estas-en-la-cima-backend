import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { type HydratedDocument } from 'mongoose';

/** Una sesión abierta (un dispositivo). Ver Session en domain/ports.ts */
@Schema({ collection: 'sessions', timestamps: true })
export class SessionDocumentModel {
  @Prop({ type: mongoose.Types.ObjectId, required: true, index: true })
  userId: mongoose.Types.ObjectId;

  // Índice único: se busca siempre por el hash del token de la cookie
  @Prop({ type: String, required: true, unique: true })
  tokenHash: string;

  /*
   * Índice TTL: MongoDB borra solo el documento cuando pasa esta fecha
   * (expireAfterSeconds: 0 = justo al vencer). Las sesiones viejas no se
   * acumulan para siempre sin necesidad de un proceso de limpieza.
   */
  @Prop({ type: Date, required: true, expires: 0 })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;
}

export type SessionDocument = HydratedDocument<SessionDocumentModel>;
export const SessionSchema = SchemaFactory.createForClass(SessionDocumentModel);
