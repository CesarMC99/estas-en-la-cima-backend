import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { type NewUser, User } from '../../domain/user.entity.js';
import {
  UserAlreadyExistsError,
  type UniqueUserField,
  type UserRepository,
} from '../../domain/user.repository.js';
import { type UserDocument, UserDocumentModel } from './user.schema.js';

/** Código de error de MongoDB cuando se viola un índice único */
const DUPLICATE_KEY_ERROR = 11000;

/**
 * Implementación del puerto UserRepository con Mongoose.
 * Traduce en ambos sentidos: documento de Mongo ⇄ entidad del dominio.
 */
@Injectable()
export class MongoUserRepository implements UserRepository {
  constructor(
    @InjectModel(UserDocumentModel.name)
    private readonly users: Model<UserDocumentModel>,
  ) {}

  async findById(id: string): Promise<User | null> {
    // Un id con formato inválido no es un error del servidor: simplemente no existe
    if (!/^[a-f0-9]{24}$/i.test(id)) return null;
    const doc = await this.users.findById(id).exec();
    return doc ? toEntity(doc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.users.findOne({ email }).exec();
    return doc ? toEntity(doc) : null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const doc = await this.users.findOne({ phone }).exec();
    return doc ? toEntity(doc) : null;
  }

  async create(user: NewUser): Promise<User> {
    try {
      const doc = await this.users.create(user);
      return toEntity(doc);
    } catch (error) {
      // El índice único de Mongo detectó el duplicado: se traduce a un error
      // del dominio que dice QUÉ campo chocó (sin exponer detalles de Mongo)
      const field = duplicatedField(error);
      if (field) throw new UserAlreadyExistsError(field);
      throw error;
    }
  }

  async updatePasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.users
      .updateOne({ _id: userId }, { $set: { passwordHash } })
      .exec();
  }
}

function toEntity(doc: UserDocument): User {
  return new User({
    id: doc._id.toString(),
    username: doc.username,
    email: doc.email,
    phone: doc.phone,
    passwordHash: doc.passwordHash,
    roles: doc.roles,
    createdAt: doc.createdAt,
  });
}

function duplicatedField(error: unknown): UniqueUserField | null {
  if (typeof error !== 'object' || error === null) return null;
  const { code, keyPattern } = error as {
    code?: number;
    keyPattern?: Record<string, unknown>;
  };
  if (code !== DUPLICATE_KEY_ERROR || !keyPattern) return null;
  const field = Object.keys(keyPattern)[0];
  return field === 'username' || field === 'email' || field === 'phone'
    ? field
    : null;
}
