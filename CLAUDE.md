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
