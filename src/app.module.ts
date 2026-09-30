import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { join } from 'node:path';
import { GraphqlExceptionFilter } from './common/filters/graphql-exception.filter.js';
import { GqlThrottlerGuard } from './common/throttling/gql-throttler.guard.js';
import {
  appConfig,
  authConfig,
  databaseConfig,
  emailConfig,
} from './config/index.js';
import { AuthModule } from './module/auth/auth.module.js';
import { CatalogModule } from './module/catalog/catalog.module.js';
import { HealthModule } from './module/health/health.module.js';
import { UsersModule } from './module/users/users.module.js';

// Se lee directo de process.env porque GraphQLModule se configura antes de
// que exista la config tipada de ConfigModule
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    // isGlobal: cualquier módulo puede inyectar la config sin volver a importarla
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, authConfig, emailConfig],
    }),

    // forRootAsync: la URI sale de la config (del .env), nunca escrita en el código
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('database.uri'),
      }),
    }),

    /*
     * GraphQL "code-first": el esquema se GENERA a partir de las clases
     * TypeScript (@ObjectType, @InputType, @Resolver). No se escribe a mano.
     * En local se guarda en src/schema.gql para que el frontend lo lea con
     * Codegen; en producción basta con tenerlo en memoria.
     */
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: false,
      autoSchemaFile: IS_PRODUCTION
        ? true
        : join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      // Explorador de la API (Apollo Sandbox) solo en desarrollo: en
      // producción no hay por qué mostrarle la API a cualquiera
      plugins: IS_PRODUCTION
        ? []
        : [ApolloServerPluginLandingPageLocalDefault()],
      // req/res en el contexto: los resolvers de cuentas los necesitarán para
      // leer y escribir la cookie de la sesión
      context: ({ req, res }: { req: Request; res: Response }) => ({
        req,
        res,
      }),
    }),

    /*
     * Límite general de peticiones por IP: 120 por minuto alcanza de sobra
     * para una persona navegando, y frena a un bot. Las mutaciones sensibles
     * (login, códigos) tienen un límite más estricto con @Throttle.
     */
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      errorMessage:
        'Demasiados intentos. Espera un minuto y vuelve a intentarlo.',
    }),

    HealthModule,
    UsersModule,
    AuthModule,
    CatalogModule,
  ],
  providers: [
    // Filtro global: traduce las excepciones a errores GraphQL con `code`
    { provide: APP_FILTER, useClass: GraphqlExceptionFilter },
    // Guard global: aplica el límite de peticiones a todos los resolvers
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
  ],
})
export class AppModule {}
