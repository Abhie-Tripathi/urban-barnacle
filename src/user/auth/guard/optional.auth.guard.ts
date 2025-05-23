import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { FastifyRequest } from 'fastify';
import { TCachedUser } from 'src/utils/types';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  cookiePrefix: string | undefined;
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private configService: ConfigService,
  ) {
    this.cookiePrefix = this.configService.get('COOKIE_PREFIX');
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: FastifyRequest = context.switchToHttp().getRequest();
    const user = await this.getUser(request);
    request['user'] = user;
    return true;
  }
  async getUser(request: FastifyRequest) {
    const key = (this.cookiePrefix ? `${this.cookiePrefix}-` : '') + 'token';
    // const requestToken = request.unsignCookie[key];
    const signedCookie = request.cookies[key];
    if (!signedCookie) {
      return null;
    }
    const requestToken = request.unsignCookie(signedCookie).value;
    if (!requestToken) {
      return null;
    }
    const user: TCachedUser | null =
      await this.cacheManager.get(requestToken);
    if (!user) {
      return null;
    }
    return user;
  }
}
