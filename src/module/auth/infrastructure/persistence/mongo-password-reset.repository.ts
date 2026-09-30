import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { type Model } from 'mongoose';
import type {
  PasswordResetCode,
  PasswordResetRepository,
} from '../../domain/ports.js';
import { PasswordResetDocumentModel } from './password-reset.schema.js';

@Injectable()
export class MongoPasswordResetRepository implements PasswordResetRepository {
  constructor(
    @InjectModel(PasswordResetDocumentModel.name)
    private readonly codes: Model<PasswordResetDocumentModel>,
  ) {}

  async replaceForUser(
    code: Omit<PasswordResetCode, 'id' | 'attempts'>,
  ): Promise<void> {
    // upsert: si ya había un código lo reemplaza (y reinicia los intentos);
    // si no, lo crea. Pedir un código nuevo invalida el anterior
    await this.codes
      .updateOne(
        { userId: new mongoose.Types.ObjectId(code.userId) },
        {
          $set: {
            codeHash: code.codeHash,
            expiresAt: code.expiresAt,
            attempts: 0,
          },
        },
        { upsert: true },
      )
      .exec();
  }

  async findByUserId(userId: string): Promise<PasswordResetCode | null> {
    const doc = await this.codes
      .findOne({ userId: new mongoose.Types.ObjectId(userId) })
      .exec();
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      codeHash: doc.codeHash,
      expiresAt: doc.expiresAt,
      attempts: doc.attempts,
    };
  }

  async incrementAttempts(codeId: string): Promise<void> {
    // $inc es atómico: dos intentos simultáneos suman 2, no 1
    await this.codes
      .updateOne({ _id: codeId }, { $inc: { attempts: 1 } })
      .exec();
  }

  async deleteForUser(userId: string): Promise<void> {
    await this.codes
      .deleteOne({ userId: new mongoose.Types.ObjectId(userId) })
      .exec();
  }
}
