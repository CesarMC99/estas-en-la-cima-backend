import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { type Model } from 'mongoose';
import type { Session, SessionRepository } from '../../domain/ports.js';
import {
  type SessionDocument,
  SessionDocumentModel,
} from './session.schema.js';

@Injectable()
export class MongoSessionRepository implements SessionRepository {
  constructor(
    @InjectModel(SessionDocumentModel.name)
    private readonly sessions: Model<SessionDocumentModel>,
  ) {}

  async create(session: Omit<Session, 'id' | 'revokedAt'>): Promise<Session> {
    const doc = await this.sessions.create({
      userId: new mongoose.Types.ObjectId(session.userId),
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
    });
    return toSession(doc);
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const doc = await this.sessions.findOne({ tokenHash }).exec();
    return doc ? toSession(doc) : null;
  }

  async revokeIfActive(sessionId: string): Promise<boolean> {
    /*
     * La condición `revokedAt: null` va DENTRO de la actualización: MongoDB
     * la evalúa y actualiza en una sola operación atómica. Si dos peticiones
     * llegan a la vez, solo una encuentra la sesión activa (modifiedCount 1).
     */
    const result = await this.sessions
      .updateOne(
        { _id: sessionId, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      )
      .exec();
    return result.modifiedCount === 1;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.sessions
      .updateMany(
        { userId: new mongoose.Types.ObjectId(userId), revokedAt: null },
        { $set: { revokedAt: new Date() } },
      )
      .exec();
  }
}

function toSession(doc: SessionDocument): Session {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    tokenHash: doc.tokenHash,
    expiresAt: doc.expiresAt,
    revokedAt: doc.revokedAt,
  };
}
