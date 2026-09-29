import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { appConfig, type AppConfig } from './config/index.js';

async function bootstrap() {
  // rawBody: guarda también los bytes ORIGINALES de cada petición. El webhook
  // de la pasarela de pagos los necesitará para verificar su firma
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // appConfig.KEY es un token: Nest lo resuelve al objeto de config ya leído
  const config = app.get<AppConfig>(appConfig.KEY);

  // Para leer la cookie httpOnly donde viajará la sesión
  app.use(cookieParser());

  // CORS con credentials: sin esto el navegador no envía ni acepta cookies
  // entre el frontend (localhost:4100) y esta API (localhost:3100)
  app.enableCors({
    origin: config.frontendUrl,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // whitelist: descarta propiedades que no están declaradas en el DTO
      whitelist: true,
      // forbidNonWhitelisted: además de descartarlas, rechaza la petición
      forbidNonWhitelisted: true,
      // transform: convierte el JSON recibido en instancias de las clases DTO
      transform: true,
    }),
  );

  await app.listen(config.port);
}

// Con módulos ES (package.json "type": "module") se puede usar await en el
// nivel superior del archivo
await bootstrap();
