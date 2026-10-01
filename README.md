# Estás en la cima · API

API GraphQL de **Estás en la cima**, el ranking peruano donde los fans donan para llevar a su producto favorito al primer lugar de su categoría.

El frontend está en [estas-en-la-cima-frontend](https://github.com/CesarMC99/estas-en-la-cima-frontend).

> **Estado:** en desarrollo. Las cuentas y el ranking funcionan; los pagos todavía no existen y los totales cargados por el script de datos iniciales son de demostración.

## Stack

- **NestJS 12** (módulos ES) + **GraphQL** code-first (Apollo Server 5)
- **MongoDB** con Mongoose 9
- **Argon2id** para contraseñas, **JWT** para el acceso
- **Vitest** para pruebas, **oxlint** para el linter
- Node 24 y pnpm

## Cómo correrlo

```bash
cp .env.example .env    # completa DATABASE_URI y JWT_ACCESS_SECRET
pnpm install
pnpm seed               # carga categorías y productos iniciales
pnpm start:dev          # http://localhost:3100/graphql
```

Otros comandos:

```bash
pnpm build       # compila (y revisa tipos)
pnpm lint        # linter
pnpm test        # pruebas unitarias
pnpm test:e2e    # pruebas de punta a punta, en una base de datos "-test" aparte
```

Prueba rápida:

```graphql
{
  health { ok database }
  cimas { category { name } product { name } totalCents }
}
```

## Qué hay construido

| Módulo | Qué hace | Estado |
|---|---|---|
| `health` | Estado del servidor y de la base de datos | ✅ |
| `users` + `auth` | Registro, login con correo o celular, sesión, recuperación de contraseña | ✅ |
| `notifications` | Envío de correos (Resend, o al log en desarrollo) | ✅ |
| `catalog` | Categorías, productos y ranking | ✅ |
| Donaciones | Pagos y suma a los totales | ⏳ Pendiente |
| Comentarios | Comentarios, fotos y videos de los mayores donantes | ⏳ Pendiente |
| Administración | Aprobar productos y comentarios, gestionar categorías | ⏳ Pendiente |

## Arquitectura

Cada dominio vive en `src/module/<dominio>/` separado en capas:

```
domain/           Entidades y reglas de negocio puras; interfaces (puertos)
application/      Casos de uso: una acción de negocio cada uno
infrastructure/   MongoDB, Argon2, JWT, correo: implementaciones de los puertos
presentation/     Resolvers GraphQL, datos de entrada validados, tipos de salida
```

Los casos de uso dependen de interfaces, no de MongoDB ni de librerías: se prueban con dobles en memoria y las piezas externas se pueden cambiar sin tocar las reglas.

## Seguridad de las cuentas

- Contraseñas con **Argon2id** (parámetros mínimos de OWASP).
- **Token de acceso** JWT de 15 minutos + **token de renovación** en cookie `httpOnly`, guardado en la base solo como hash SHA-256.
- El token de renovación **rota en cada uso**; si llega uno ya usado (señal de robo) se cierran todas las sesiones de la cuenta.
- El login responde lo mismo, y tarda lo mismo, exista o no la cuenta.
- Recuperación con código de 6 dígitos: vence en 10 minutos, 5 intentos, un solo uso; nunca revela si la cuenta existe.
- Límite de peticiones por IP: 120 por minuto en general y 5 por minuto en login, registro y códigos.

## Reglas del ranking

- Los montos son **enteros en céntimos**.
- Se rankean productos; cada uno pertenece a una categoría. Solo cuentan los aprobados.
- Orden: más dinero primero; en un empate, el que llegó antes a ese monto.
- A un perseguidor le falta la diferencia con el #1 **más S/ 1**: igualar no alcanza.

## Bitácora

### 29 de septiembre de 2026

- Base del proyecto: NestJS 12, GraphQL code-first, MongoDB, configuración tipada, filtro global de errores con códigos estables.
- Cuentas completas: registro, login, sesión con cookie rotativa, cierre de sesión y recuperación de contraseña.
- Catálogo y ranking: consultas `categories`, `cimas` y `categoryRanking`, con script de datos iniciales.
- 37 pruebas unitarias y pruebas de punta a punta de las cuentas.
