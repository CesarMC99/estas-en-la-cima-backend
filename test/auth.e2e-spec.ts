import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { EMAIL_SENDER } from '../src/common/constants/injection-tokens.js';
import type {
  EmailMessage,
  EmailSender,
} from '../src/module/notifications/domain/email-sender.js';

/*
 * Flujo completo de cuentas contra una base de datos REAL de pruebas
 * (ver test/setup-e2e.ts): registro, sesión con cookie, renovación, cierre
 * y recuperación de contraseña.
 */

/** Correo falso que guarda los mensajes para leer el código de recuperación */
class InboxEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }
}

describe('Cuentas (e2e)', () => {
  let app: INestApplication<App>;
  const inbox = new InboxEmailSender();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EMAIL_SENDER)
      .useValue(inbox)
      .compile();

    app = moduleRef.createNestApplication();
    // cookie-parser se registra en main.ts, que las pruebas no ejecutan
    const { default: cookieParser } = await import('cookie-parser');
    app.use(cookieParser());
    await app.init();

    // Base de pruebas limpia en cada ejecución (índices incluidos)
    const connection = app.get<Connection>(getConnectionToken());
    await connection.dropDatabase();
    await connection.syncIndexes();
  });

  afterAll(async () => {
    await app.close();
  });

  /** Envía una operación GraphQL, opcionalmente con token y cookies */
  function gql(
    query: string,
    options: { token?: string; cookie?: string[] } = {},
  ) {
    const req = request(app.getHttpServer()).post('/graphql');
    if (options.token) req.set('Authorization', `Bearer ${options.token}`);
    if (options.cookie) req.set('Cookie', options.cookie);
    return req.send({ query });
  }

  const REGISTER = `mutation {
    register(input: { username: "Fan_Chalaco", email: "fan@cima.test", phone: "987 654 321", password: "clave1234" }) {
      accessToken account { username email phone roles }
    }
  }`;

  let cookie: string[];

  it('registra la cuenta, deja la sesión iniciada y guarda la cookie httpOnly', async () => {
    const res = await gql(REGISTER).expect(200);

    expect(res.body.data.register.account).toEqual({
      username: 'fan_chalaco',
      email: 'fan@cima.test',
      phone: '+51987654321',
      roles: ['fan'],
    });
    cookie = res.get('Set-Cookie') ?? [];
    expect(cookie[0]).toMatch(/^cima_session=.+HttpOnly/);

    const me = await gql('{ me { username } }', {
      token: res.body.data.register.accessToken,
    });
    expect(me.body.data.me.username).toBe('fan_chalaco');
  });

  it('no permite registrar el mismo correo dos veces', async () => {
    const res = await gql(REGISTER);
    expect(res.body.errors[0].extensions.code).toBe('CONFLICT');
  });

  it('renueva la sesión con la cookie y la vieja deja de servir', async () => {
    const res = await gql('mutation { refreshSession { accessToken } }', {
      cookie,
    });
    expect(res.body.data.refreshSession.accessToken).toBeTruthy();
    const newCookie = res.get('Set-Cookie') ?? [];

    const reused = await gql('mutation { refreshSession { accessToken } }', {
      cookie,
    });
    expect(reused.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');

    // Reutilizar la vieja se trata como robo: también cae la nueva
    const afterTheft = await gql(
      'mutation { refreshSession { accessToken } }',
      { cookie: newCookie },
    );
    expect(afterTheft.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('ingresa con el celular y cierra sesión', async () => {
    const login = await gql(
      'mutation { login(input: { emailOrPhone: "987654321", password: "clave1234" }) { accessToken } }',
    );
    const sessionCookie = login.get('Set-Cookie') ?? [];
    expect(login.body.data.login.accessToken).toBeTruthy();

    await gql('mutation { logout }', { cookie: sessionCookie }).expect(200);
    const refresh = await gql('mutation { refreshSession { accessToken } }', {
      cookie: sessionCookie,
    });
    expect(refresh.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('recupera la contraseña con el código del correo', async () => {
    await gql(
      'mutation { requestPasswordReset(input: { emailOrPhone: "fan@cima.test" }) }',
    ).expect(200);

    const code = /\b(\d{6})\b/.exec(inbox.sent.at(-1)?.text ?? '')?.[1];
    expect(code).toMatch(/^\d{6}$/);

    const reset = await gql(
      `mutation { resetPassword(input: { emailOrPhone: "fan@cima.test", code: "${code}", newPassword: "nueva1234" }) }`,
    );
    expect(reset.body.data.resetPassword).toBe(true);

    const oldPassword = await gql(
      'mutation { login(input: { emailOrPhone: "fan@cima.test", password: "clave1234" }) { accessToken } }',
    );
    expect(oldPassword.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');

    const newPassword = await gql(
      'mutation { login(input: { emailOrPhone: "fan@cima.test", password: "nueva1234" }) { accessToken } }',
    );
    expect(newPassword.body.data.login.accessToken).toBeTruthy();
  });
});
