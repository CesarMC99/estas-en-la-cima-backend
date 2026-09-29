# Estás en la cima · API

API GraphQL de **Estás en la cima**, el ranking peruano donde los fans donan para llevar a su producto favorito al primer lugar de su categoría.

- **NestJS 12** (módulos ES) + **GraphQL** code-first (Apollo)
- **MongoDB** con Mongoose
- Arquitectura por capas: dominio, aplicación, infraestructura y presentación
- Pruebas con **Vitest**

## Cómo correrlo

```bash
cp .env.example .env    # y completa DATABASE_URI
pnpm install
pnpm start:dev          # http://localhost:3100/graphql
```

Prueba rápida:

```graphql
{ health { ok database } }
```

El frontend está en [estas-en-la-cima-frontend](https://github.com/CesarMC99/estas-en-la-cima-frontend).
