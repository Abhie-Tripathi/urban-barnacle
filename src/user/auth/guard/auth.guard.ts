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
import { RedisService } from 'src/redis/redis.service';
import { TCachedUser } from 'src/utils/types';

@Injectable()
export class AuthGuard implements CanActivate {
  cookiePrefix: string | undefined;
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject() private readonly redisService: RedisService,
    private configService: ConfigService,
  ) {
    this.cookiePrefix = process.env.COOKIE_PREFIX;
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: FastifyRequest = context.switchToHttp().getRequest();
    const path = request.originalUrl.split('?')[0];
    const pathBreakdown = path.split('/').filter((p) => p !== '');
    // console.log(pathBreakdown, path);

    if (
      pathBreakdown.length >= 1 &&
      (pathBreakdown[0] === 'auth' || pathBreakdown[0] === 'public' || (pathBreakdown[0] === 'others' && pathBreakdown[1] === 'contactMail' || path === `/me/account/${process.env.STRIPE_PASS_TOKEN}/membership`))
    ) {
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
    const userString = await this.redisService.get(`user-${requestToken}`);
    const user: TCachedUser | undefined = userString
      ? JSON.parse(userString)
      : undefined;
    if (!user) {
      return null;
    }
    return user;
  }
}
