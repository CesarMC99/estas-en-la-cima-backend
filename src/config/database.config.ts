import { registerAs } from '@nestjs/config';

/**
 * Conexión a MongoDB. La URI vive en el .env para no dejar credenciales en
 * el código ni en GitHub.
 */
export const databaseConfig = registerAs('database', () => ({
  uri: process.env.DATABASE_URI ?? 'mongodb://localhost:27017/estas-en-la-cima',
}));

export type DatabaseConfig = ReturnType<typeof databaseConfig>;
