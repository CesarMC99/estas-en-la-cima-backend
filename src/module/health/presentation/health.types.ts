import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum DatabaseStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
}

// Registrar el enum lo convierte en un tipo del esquema GraphQL
// (y Codegen lo generará como tipo en el frontend)
registerEnumType(DatabaseStatus, {
  name: 'DatabaseStatus',
  description: 'Estado de la conexión con MongoDB',
});

@ObjectType({ description: 'Estado del servidor, para saber si está vivo' })
export class HealthStatus {
  @Field(() => Boolean, { description: 'Siempre true si el servidor responde' })
  ok: boolean;

  @Field(() => DatabaseStatus)
  database: DatabaseStatus;
}
