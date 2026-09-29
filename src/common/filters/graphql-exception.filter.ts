import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { GraphQLError } from 'graphql';

/**
 * Filtro global de excepciones.
 *
 * Manejo CENTRALIZADO de errores: los casos de uso lanzan excepciones estándar
 * de Nest (UnauthorizedException, ConflictException…) sin saber nada de
 * GraphQL, y este filtro las traduce a GraphQLError con un `code` estable en
 * `extensions`. Así el frontend reacciona por código (si es 'UNAUTHENTICATED',
 * renovar la sesión) y no comparando textos.
 *
 * También evita fugas de información: cualquier error no previsto se responde
 * como INTERNAL_SERVER_ERROR genérico y el detalle solo queda en el log.
 */
@Catch()
export class GraphqlExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GraphqlExceptionFilter.name);

  // Estado HTTP → código de error GraphQL convencional (el que usa Apollo)
  private static readonly CODE_BY_STATUS: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'BAD_USER_INPUT',
    [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
    [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
    [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
    [HttpStatus.CONFLICT]: 'CONFLICT',
    [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
    // Un servicio externo caído o sin configurar (pasarela de pagos, correo…)
    [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
  };

  catch(exception: unknown, host: ArgumentsHost) {
    // Peticiones REST (como el webhook de la pasarela de pagos): en HTTP no
    // basta con DEVOLVER el error como en GraphQL, hay que ESCRIBIR la
    // respuesta; si no, la petición se quedaría colgada
    if (host.getType() === 'http') {
      return this.replyHttp(exception, host.switchToHttp().getResponse<Response>());
    }

    // Si ya es un GraphQLError (por ejemplo, una consulta mal escrita), se respeta
    if (exception instanceof GraphQLError) {
      return exception;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = GraphqlExceptionFilter.CODE_BY_STATUS[status] ?? 'INTERNAL_SERVER_ERROR';

      // El ValidationPipe empaqueta los mensajes de validación en response.message
      const response = exception.getResponse();
      const raw =
        typeof response === 'object' && response !== null
          ? ((response as { message?: string | string[] }).message ?? exception.message)
          : exception.message;
      // En inputs anidados el ValidationPipe antepone la ruta del campo
      // ("perfil.El correo…"): se quita, el mensaje es para personas
      const message = Array.isArray(raw)
        ? raw.map((text) => text.replace(/^(\w+\.)+/, '')).join(', ')
        : raw;

      return new GraphQLError(message, { extensions: { code, status } });
    }

    // Error inesperado: detalle completo en el log, mensaje genérico al cliente
    this.logger.error(exception);
    return new GraphQLError('Error interno del servidor', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }

  /** Respuesta JSON para REST, con la misma regla: nada interno se filtra */
  private replyHttp(exception: unknown, res: Response): void {
    if (exception instanceof HttpException) {
      res.status(exception.getStatus()).json(exception.getResponse());
      return;
    }
    this.logger.error(exception);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: 500, message: 'Error interno del servidor' });
  }
}
