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
import { CachedUser } from 'src/shared/types';

@Injectable()
export class AuthGuard implements CanActivate {
  cookiePrefix: string | undefined;
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private configService: ConfigService,
  ) {
    this.cookiePrefix = this.configService.get('COOKIE_PREFIX');
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: FastifyRequest = context.switchToHttp().getRequest();
    console.log({ cookies: request.cookies });
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
    const requestToken = request.unsignCookie(
      request.cookies[key] as string,
    ).value;
    // const requestToken = request.unsignCookie(request.cookies.token as string).value;
    if (!requestToken) {
      return null;
    }
    const user: CachedUser | undefined =
      await this.cacheManager.get(requestToken);
    if (!user) {
      return null;
    }
    return user;
  }
}
