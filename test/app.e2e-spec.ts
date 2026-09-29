import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

/*
 * Prueba de punta a punta: levanta la aplicación completa (GraphQL + MongoDB
 * del .env) y le hace una petición HTTP real, como lo haría el frontend.
 */
describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('la consulta health responde que el servidor y la base de datos están bien', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ health { ok database } }' })
      .expect(200);

    expect(response.body).toEqual({
      data: { health: { ok: true, database: 'CONNECTED' } },
    });
  });
});
