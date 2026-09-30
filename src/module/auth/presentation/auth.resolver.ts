import { Inject, UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../../common/auth/authenticated-user.js';
import { CurrentUser } from '../../../common/auth/current-user.decorator.js';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard.js';
import { appConfig, type AppConfig } from '../../../config/index.js';
import type { AuthResult } from '../application/session-issuer.js';
import { GetMyAccountUseCase } from '../application/use-cases/get-my-account.use-case.js';
import { LoginUseCase } from '../application/use-cases/login.use-case.js';
import { LogoutUseCase } from '../application/use-cases/logout.use-case.js';
import { RefreshSessionUseCase } from '../application/use-cases/refresh-session.use-case.js';
import { RegisterUseCase } from '../application/use-cases/register.use-case.js';
import { RequestPasswordResetUseCase } from '../application/use-cases/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case.js';
import {
  LoginInput,
  RegisterInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
} from './auth.inputs.js';
import { AccountType, AuthPayload, toAccountType } from './auth.types.js';
import {
  clearSessionCookie,
  readSessionCookie,
  setSessionCookie,
} from './session-cookie.js';

interface GqlContext {
  req: Request;
  res: Response;
}

/*
 * Límites estrictos para las operaciones que un atacante querría repetir
 * miles de veces (probar contraseñas o códigos): 5 por minuto por IP.
 */
const STRICT_LIMIT = { default: { limit: 5, ttl: 60_000 } };

/**
 * Resolver de cuentas. Solo traduce GraphQL ⇄ casos de uso y maneja la
 * cookie: ninguna regla de negocio vive aquí.
 */
@Resolver()
export class AuthResolver {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly getMyAccountUseCase: GetMyAccountUseCase,
    @Inject(appConfig.KEY) private readonly config: AppConfig,
  ) {}

  @Mutation(() => AuthPayload, {
    description: 'Crear cuenta (deja la sesión iniciada)',
  })
  @Throttle(STRICT_LIMIT)
  async register(
    @Args('input') input: RegisterInput,
    @Context() { res }: GqlContext,
  ): Promise<AuthPayload> {
    return this.respondWithSession(
      await this.registerUseCase.execute(input),
      res,
    );
  }

  @Mutation(() => AuthPayload, { description: 'Ingresar con correo o celular' })
  @Throttle(STRICT_LIMIT)
  async login(
    @Args('input') input: LoginInput,
    @Context() { res }: GqlContext,
  ): Promise<AuthPayload> {
    return this.respondWithSession(await this.loginUseCase.execute(input), res);
  }

  @Mutation(() => AuthPayload, {
    description:
      'Renueva la sesión con la cookie y entrega un token de acceso nuevo',
  })
  async refreshSession(
    @Context() { req, res }: GqlContext,
  ): Promise<AuthPayload> {
    try {
      return this.respondWithSession(
        await this.refreshSessionUseCase.execute(readSessionCookie(req)),
        res,
      );
    } catch (error) {
      // Si la sesión no sirve, también se borra la cookie inútil del navegador
      clearSessionCookie(res, this.config.isProduction);
      throw error;
    }
  }

  @Mutation(() => Boolean, { description: 'Cerrar sesión en este dispositivo' })
  async logout(@Context() { req, res }: GqlContext): Promise<boolean> {
    await this.logoutUseCase.execute(readSessionCookie(req));
    clearSessionCookie(res, this.config.isProduction);
    return true;
  }

  @Mutation(() => Boolean, {
    description:
      'Envía un código de 6 dígitos al correo de la cuenta. Responde true siempre, exista o no la cuenta',
  })
  @Throttle(STRICT_LIMIT)
  async requestPasswordReset(
    @Args('input') input: RequestPasswordResetInput,
  ): Promise<boolean> {
    await this.requestPasswordResetUseCase.execute(input.emailOrPhone);
    return true;
  }

  @Mutation(() => Boolean, {
    description: 'Cambia la contraseña con el código del correo',
  })
  @Throttle(STRICT_LIMIT)
  async resetPassword(
    @Args('input') input: ResetPasswordInput,
  ): Promise<boolean> {
    await this.resetPasswordUseCase.execute(input);
    return true;
  }

  @Query(() => AccountType, {
    description: 'La cuenta de quien tiene la sesión iniciada',
  })
  @UseGuards(JwtAuthGuard)
  async me(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AccountType> {
    return toAccountType(
      await this.getMyAccountUseCase.execute(currentUser.userId),
    );
  }

  /** Pone el token de renovación en la cookie y devuelve el resto por GraphQL */
  private respondWithSession(result: AuthResult, res: Response): AuthPayload {
    setSessionCookie(
      res,
      result.refreshToken,
      result.refreshTokenExpiresAt,
      this.config.isProduction,
    );
    return {
      accessToken: result.accessToken,
      accessTokenExpiresIn: result.accessTokenExpiresIn,
      account: toAccountType(result.user),
    };
  }
}
