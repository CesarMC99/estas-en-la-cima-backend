import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { USER_REPOSITORY } from '../../common/constants/injection-tokens.js';
import { MongoUserRepository } from './infrastructure/persistence/mongo-user.repository.js';
import {
  UserDocumentModel,
  UserSchema,
} from './infrastructure/persistence/user.schema.js';

/**
 * Módulo de usuarios: dueño de los datos de la cuenta. Exporta el
 * repositorio (por su token) para que el módulo de autenticación lo use sin
 * saber que por dentro es Mongo.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserDocumentModel.name, schema: UserSchema },
    ]),
  ],
  providers: [{ provide: USER_REPOSITORY, useClass: MongoUserRepository }],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
