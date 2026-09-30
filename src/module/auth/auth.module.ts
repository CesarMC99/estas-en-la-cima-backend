import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import {
  ACCESS_TOKEN_ISSUER,
  PASSWORD_HASHER,
  PASSWORD_RESET_REPOSITORY,
  SESSION_REPOSITORY,
} from '../../common/constants/injection-tokens.js';
import { authConfig, type AuthConfig } from '../../config/index.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { UsersModule } from '../users/users.module.js';
import { SessionIssuer } from './application/session-issuer.js';
import { GetMyAccountUseCase } from './application/use-cases/get-my-account.use-case.js';
import { LoginUseCase } from './application/use-cases/login.use-case.js';
import { LogoutUseCase } from './application/use-cases/logout.use-case.js';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case.js';
import { RegisterUseCase } from './application/use-cases/register.use-case.js';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case.js';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher.js';
import { JwtAccessTokenIssuer } from './infrastructure/jwt-access-token.issuer.js';
import { MongoPasswordResetRepository } from './infrastructure/persistence/mongo-password-reset.repository.js';
import { MongoSessionRepository } from './infrastructure/persistence/mongo-session.repository.js';
import {
  PasswordResetDocumentModel,
  PasswordResetSchema,
} from './infrastructure/persistence/password-reset.schema.js';
import {
  SessionDocumentModel,
  SessionSchema,
} from './infrastructure/persistence/session.schema.js';
import { AuthResolver } from './presentation/auth.resolver.js';

/**
 * Módulo de autenticación. Aquí se "enchufa" cada puerto con su
 * implementación real (la lista de providers): cambiar Argon2 por otro
 * algoritmo o Mongo por otra base se hace en este archivo y en ningún otro.
 */
@Module({
  imports: [
    UsersModule,
    NotificationsModule,
    MongooseModule.forFeature([
      { name: SessionDocumentModel.name, schema: SessionSchema },
      { name: PasswordResetDocumentModel.name, schema: PasswordResetSchema },
    ]),
    JwtModule.registerAsync({
      inject: [authConfig.KEY],
      useFactory: (config: AuthConfig) => ({
        secret: config.accessSecret,
        signOptions: { expiresIn: config.accessTtlSeconds, algorithm: 'HS256' },
        // Al verificar solo se acepta HS256: evita ataques que cambian el
        // algoritmo del token (por ejemplo a "none") para saltarse la firma
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  providers: [
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: ACCESS_TOKEN_ISSUER, useClass: JwtAccessTokenIssuer },
    { provide: SESSION_REPOSITORY, useClass: MongoSessionRepository },
    {
      provide: PASSWORD_RESET_REPOSITORY,
      useClass: MongoPasswordResetRepository,
    },
    SessionIssuer,
    RegisterUseCase,
    LoginUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    GetMyAccountUseCase,
    JwtAuthGuard,
    RolesGuard,
    AuthResolver,
  ],
  // Otros módulos (donaciones, comentarios…) protegerán sus resolvers con
  // JwtAuthGuard, que necesita el emisor de tokens
  exports: [ACCESS_TOKEN_ISSUER, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
