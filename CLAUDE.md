# CLAUDE.md

Backend de **Estás en la cima**: ranking peruano donde los fans donan para llevar a su producto favorito al #1 de su categoría. El frontend (Next.js) vive en `../frontend`.

## Comandos

```bash
pnpm start:dev        # API con recarga en http://localhost:3100/graphql
pnpm build            # nest build (también revisa tipos)
pnpm lint             # oxlint con reglas que usan los tipos
pnpm test             # pruebas unitarias (Vitest, *.spec.ts junto al código)
pnpm test:e2e         # pruebas de punta a punta (test/*.e2e-spec.ts, usan la BD del .env)
```

Necesita `.env` (ver `.env.example`): `PORT` (3100), `FRONTEND_URL` (CORS, http://localhost:4100), `DATABASE_URI` (Atlas, base `estas-en-la-cima`).

## Stack

- Usar siempre las últimas versiones estables. Excepción actual: TypeScript se queda en 6.x porque @nestjs/graphql 14 aún no admite TypeScript 7 (revisar su peerDependency antes de subir).
- **NestJS 12 con módulos ES** (`"type": "module"`): los imports relativos llevan extensión `.js` (`./app.module.js`) aunque el archivo sea `.ts`. Las librerías CommonJS (mongoose, etc.) exponen sus *valores* por el import por defecto (`mongoose.ConnectionStates`); los imports con nombre solo sirven para tipos.
- **Vitest** en vez de Jest y **oxlint** en vez de ESLint (lo que trae el CLI de Nest 12).
- `isolatedModules` + `emitDecoratorMetadata`: los tipos usados en firmas con decoradores deben importarse con `import type`.

## Arquitectura

Arquitectura por capas por módulo en `src/module/<dominio>/` (**singular** `module`):

- `domain/` — entidades y reglas de negocio sin frameworks, interfaces de repositorios (puertos)
- `application/` — casos de uso (una acción de negocio cada uno), dependen solo de interfaces inyectadas por tokens
- `infrastructure/` — esquemas Mongoose, mappers, implementaciones de repositorios, adaptadores externos (pasarela de pagos, correo)
- `presentation/` — resolvers GraphQL, `@InputType()` con class-validator, `@ObjectType()`

Módulos técnicos sin reglas de negocio (como `health`) pueden tener solo `presentation/`.

Transversal en `src/common/`: `GraphqlExceptionFilter` (global: traduce excepciones de Nest a `GraphQLError` con `extensions.code` estable: `UNAUTHENTICATED`, `CONFLICT`, `BAD_USER_INPUT`…). Config tipada en `src/config/` con `registerAs` (`app`, `database`), cargada globalmente; se inyecta con `@Inject(appConfig.KEY)`.

GraphQL code-first: el esquema se genera en `src/schema.gql` al arrancar (nunca editarlo a mano). Tras cambiarlo, correr `pnpm codegen` en el frontend con el backend encendido.

## Reglas de producto (resumen)

- Montos SIEMPRE en céntimos enteros. El ranking y los totales los calcula el backend.
- Se rankean **productos**; cada producto pertenece a una sola categoría. Las categorías las crea solo el admin; los productos los proponen los fans (gratis) y el admin los aprueba.
- El #1 de cada categoría muestra 3 comentarios: los de sus 3 mayores donantes; solo el mayor donante puede tener foto o video (se oculta si pierde ese puesto). Todo comentario/foto/video requiere aprobación del admin.
- Donar y comentar requieren cuenta. Pagos en soles con Culqi (Yape, Plin, tarjetas, PagoEfectivo); una donación suma solo cuando el pago se confirma.
- Empate de totales: queda arriba el que llegó primero al monto.

## Convenciones

- Comentarios del código en español, explicando el porqué.
- Mensajes de error para el usuario en español.

## Cuentas y sesión (módulos `users`, `auth`, `notifications`)

- Registro con `username` (minúsculas, `[a-z0-9_]`, 3–20), `email`, `phone` (celular peruano, se guarda como `+51XXXXXXXXX`) y contraseña (8–128). Login con **correo o celular** (`parseLoginIdentifier`). Índices únicos en los tres campos; el duplicado se traduce a `CONFLICT` con mensaje por campo.
- Contraseñas con **Argon2id** (`@node-rs/argon2`, parámetros por defecto = mínimos de OWASP). Login fallido: siempre "Correo, celular o contraseña incorrectos" y se calcula un hash aunque la cuenta no exista (mismo tiempo de respuesta).
- **Sesión**: token de acceso JWT HS256 de 15 min (`Authorization: Bearer`) + token de renovación opaco en cookie httpOnly `cima_session` (`path=/graphql`, `SameSite=Lax`, `Secure` en producción). En la base (`sessions`) solo se guarda su SHA-256; índice TTL borra las vencidas. `refreshSession` rota (un solo uso, `revokeIfActive` atómico) y si llega un token ya usado se revocan **todas** las sesiones del usuario. `logout` revoca la del dispositivo.
- **Recuperación**: `requestPasswordReset` responde `true` siempre (no revela si existe la cuenta) y manda un código de 6 dígitos al **correo** de la cuenta aunque se haya escrito el celular (sin SMS). El código se guarda con Argon2, vence en 10 min, máximo 5 intentos, un código activo por usuario. `resetPassword` exitoso borra el código y cierra todas las sesiones.
- Correo: puerto `EMAIL_SENDER`; con `RESEND_API_KEY` usa Resend, sin ella escribe el correo en el log (en local el código se lee en la terminal del backend).
- Protección: `@UseGuards(JwtAuthGuard)` + `@CurrentUser()` (el id sale del token); `@Roles('admin')` + `RolesGuard`. Límite global de 120 peticiones/min por IP (`GqlThrottlerGuard`) y 5/min en register, login, requestPasswordReset y resetPassword.
- Pruebas: unitarias de casos de uso con dobles de `test-helpers.ts` (sin base ni Nest); e2e en `test/` contra la base `<nombre>-test` (la crea `test/setup-e2e.ts`, se borra al empezar) y con `EMAIL_SENDER` reemplazado por un buzón en memoria.
