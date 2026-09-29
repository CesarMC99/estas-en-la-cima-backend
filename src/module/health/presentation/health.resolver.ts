import { Query, Resolver } from '@nestjs/graphql';
import { InjectConnection } from '@nestjs/mongoose';
// mongoose está publicado como CommonJS: desde un módulo ES sus valores se
// leen del import por defecto (`mongoose.ConnectionStates`); las importaciones
// con nombre solo funcionan para tipos, que se borran al compilar
import mongoose, { type Connection } from 'mongoose';
import { DatabaseStatus, HealthStatus } from './health.types.js';

/**
 * Consulta `health`: responde si el servidor está vivo y conectado a MongoDB.
 *
 * Sirve para dos cosas: comprobar que la base del backend funciona (hoy) y,
 * cuando lo despleguemos, que el hosting sepa si el servicio está sano.
 *
 * A diferencia de los módulos de negocio (cuentas, ranking…), este no tiene
 * capas domain/application/infrastructure: no hay reglas de negocio que
 * proteger, solo una lectura técnica. Aplicar las 4 capas aquí sería
 * complejidad sin beneficio.
 */
@Resolver(() => HealthStatus)
export class HealthResolver {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Query(() => HealthStatus, { description: 'Estado del servidor y de la base de datos' })
  health(): HealthStatus {
    const isConnected = this.connection.readyState === mongoose.ConnectionStates.connected;
    return {
      ok: true,
      database: isConnected ? DatabaseStatus.CONNECTED : DatabaseStatus.DISCONNECTED,
    };
  }
}
