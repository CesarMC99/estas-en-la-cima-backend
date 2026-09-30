import { type ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';

/**
 * Límite de peticiones por IP, adaptado a GraphQL.
 *
 * El ThrottlerGuard original busca la petición HTTP en el lugar donde la deja
 * un controlador REST; en GraphQL está dentro del contexto. Este guard solo
 * le dice dónde buscarla. Los límites se definen en app.module.ts (general)
 * y con @Throttle en las mutaciones sensibles (login, códigos).
 */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  // Mismo tipo de retorno que declara ThrottlerGuard para este método
  protected override getRequestResponse(context: ExecutionContext): {
    req: Record<string, any>;
    res: Record<string, any>;
  } {
    if (context.getType<string>() !== 'graphql') {
      return super.getRequestResponse(context);
    }
    const { req, res } = GqlExecutionContext.create(context).getContext<{
      req: Request;
      res: Response;
    }>();
    return { req, res };
  }
}
