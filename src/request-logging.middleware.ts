import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestLoggingMiddleware');

  use(req: FastifyRequest, res: FastifyReply, next) {
    const { method, originalUrl, body, headers } = req;
    this.logger.log({
      method,
      url: originalUrl,
      body,
      headers,
    });
    next();
  }
}
