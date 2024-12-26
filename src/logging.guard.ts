import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TCachedUser } from './shared/types';
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  cookiePrefix: string | undefined;
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.cookiePrefix = process.env.COOKIE_PREFIX;
  }

  async use(req: FastifyRequest, res: FastifyReply, next: NextFunction) {
    const { method, url, body, headers } = req;

    try {
      // Retrieve userId from cache
      // const { userId } = await this.getUser(req);

      // Log request to database
      await this.prisma.apiLogs.create({
        data: {
          path: url,
          request: {
            query: req.query ?? null,
            method: req.method,
            body: req.body ?? null,
            headers: req.headers,
          } as any,
          // userId: userId,
        },
      });
    } catch (error) {
      // console.log(error);
    }
    next();
  }
  async getUser(request: FastifyRequest) {
    const key = (this.cookiePrefix ? `${this.cookiePrefix}-` : '') + 'token';
    const requestToken =
      request?.unsignCookie(request.cookies[key] as string).value ?? undefined;

    if (!requestToken) {
      return null;
    }

    const user: TCachedUser | undefined =
      await this.cacheManager.get(requestToken);

    if (!user) {
      return null;
    }

    return { userId: user.id };
  }
}
