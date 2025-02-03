import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  UnauthorizedException,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { FastifyRequest } from 'fastify';
import { TCachedUser } from 'src/utils/types';

@Injectable()
export class AuthGuard implements CanActivate {
  cookiePrefix: string | undefined;
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private configService: ConfigService,
  ) {
    this.cookiePrefix = process.env.COOKIE_PREFIX;
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: FastifyRequest = context.switchToHttp().getRequest();
    const path = request.originalUrl.split('?')[0];
    const pathBreakdown = path.split('/').filter((p) => p !== '');
    if (pathBreakdown.length >= 1 && pathBreakdown[0] === 'auth') {
      return true;
    }
    const user = await this.getUser(request);
    if (!user) {
      throw new HttpException(
        'Incorrect or Expired Cookies',
        HttpStatus.UNAUTHORIZED,
      );
    }
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
    const user: TCachedUser | undefined =
      await this.cacheManager.get(requestToken);
    if (!user) {
      return null;
    }
    return user;
  }
}
