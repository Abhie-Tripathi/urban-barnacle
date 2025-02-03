import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';
import * as fs from 'fs';

@Injectable()
export class CorsGaurd implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = context.switchToHttp();
    const response: FastifyReply = ctx.getResponse();
    const request: FastifyRequest = ctx.getRequest();
    const allowedOrigins: string[] = JSON.parse(
      this.config.get('ORIGIN') ?? '[]',
    );
    const url = request.originalUrl;
    const origin: string | undefined = request.headers.origin;
    response.header('Access-Control-Allow-Origin', origin);
    response.header('access-control-allow-credentials', true);
    if (!origin) {
      return true;
    }
    const fileName = 'CorsGuard.txt';
    if (allowedOrigins.includes(origin)) {
      return true;
    } else {
      const publicEndpoint: string[] = ['/public/widget'];
      const url = request.originalUrl;

      const publicEndpointRegex = new RegExp(
        publicEndpoint.map((endpoint) => `^${endpoint}`).join('|'),
      );
      const isPublic = publicEndpointRegex.test(url);
      if (url.includes('/event') && url.includes('/public/widget'))
        return false;
      if (isPublic) return true;
    }
    return false;
  }
}
