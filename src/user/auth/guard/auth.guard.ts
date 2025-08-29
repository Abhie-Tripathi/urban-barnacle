import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { blackListDomain, TCachedUser } from 'src/utils/types';

@Injectable()
export class AuthGuard implements CanActivate {
  cookiePrefix = process.env.COOKIE_PREFIX;

  constructor(
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();

    const path = request.url.split('?')[0];
    const pathBreakdown = path.split('/').filter((p) => p !== '');

    // Allow public routes
    if (
      pathBreakdown.length >= 1 &&
      (['auth', 'public', 'others'].includes(pathBreakdown[0]) ||
        path === `/me/account/${process.env.STRIPE_PASS_TOKEN}/membership`)
    ) {
      return true;
    }

    const user = await this.getUser(request, reply);
    if (!user) {
      throw new HttpException('Incorrect or Expired Cookies', HttpStatus.UNAUTHORIZED);
    }

    request['user'] = user;
    return true;
  }

  async getUser(request: FastifyRequest, reply: FastifyReply): Promise<TCachedUser | null> {
    const key = (this.cookiePrefix ? `${this.cookiePrefix}-` : '') + 'token';
    const signedCookie = request.cookies[key];

    if (!signedCookie) return null;

    const requestToken = request.unsignCookie(signedCookie)?.value;
    if (!requestToken) return null;

    const userString = await this.redisService.get(`user-${requestToken}`);
    const user: TCachedUser | undefined = userString ? JSON.parse(userString) : undefined;
    if (!user) return null;

    // Blacklisted domain check
    if (blackListDomain.includes(user.email.split('@')[1])) {
      const dbUser = await this.prismaService.user.findUnique({
        where: { id: user.id },
        select: { id: true, email: true, primaryAccountId: true },
      });
      console.log(dbUser, user);

      if (dbUser && dbUser.primaryAccountId && dbUser.primaryAccountId !== user.accountId) {
        // Clear cookie from browser
        reply.clearCookie(key);

        // Delete from Redis
        await this.redisService.del(user.token);

        return null; // triggers Unauthorized in canActivate
      }
    }

    return user;
  }
}


// import { CACHE_MANAGER } from '@nestjs/cache-manager';
// import {
//   Injectable,
//   CanActivate,
//   ExecutionContext,
//   Inject,
//   UnauthorizedException,
//   HttpStatus,
//   HttpException,
// } from '@nestjs/common';
// // import { ConfigService } from '@nestjs/config';
// // import { Cache } from 'cache-manager';
// import { FastifyRequest } from 'fastify';
// import { PrismaService } from 'src/prisma/prisma.service';
// import { RedisService } from 'src/redis/redis.service';
// import { blackListDomain, TCachedUser } from 'src/utils/types';

// @Injectable()
// export class AuthGuard implements CanActivate {
//   cookiePrefix: string | undefined;
//   constructor(
//     // @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
//     private readonly redisService: RedisService,
//     private readonly prismaService: PrismaService,
//     // private configService: ConfigService,
//   ) {
//     this.cookiePrefix = process.env.COOKIE_PREFIX;
//   }
//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const request: FastifyRequest = context.switchToHttp().getRequest();
//     const path = request.originalUrl.split('?')[0];
//     const pathBreakdown = path.split('/').filter((p) => p !== '');
//     // console.log(pathBreakdown, path);

//     if (
//       pathBreakdown.length >= 1 &&
//       (pathBreakdown[0] === 'auth' ||
//         pathBreakdown[0] === 'public' ||
//         pathBreakdown[0] === 'others' ||
//         path === `/me/account/${process.env.STRIPE_PASS_TOKEN}/membership`)
//     ) {
//       return true;
//     }
//     const user = await this.getUser(request);
//     if (!user) {
//       throw new HttpException(
//         'Incorrect or Expired Cookies',
//         HttpStatus.UNAUTHORIZED,
//       );
//     }
//     request['user'] = user;
//     return true;
//   }
//   async getUser(request: FastifyRequest) {
//     const key = (this.cookiePrefix ? `${this.cookiePrefix}-` : '') + 'token';
//     const signedCookie = request.cookies[key];
//     if (!signedCookie) {
//       return null;
//     }

//     const requestToken = request.unsignCookie(signedCookie).value;
//     if (!requestToken) {
//       return null;
//     }

//     const userString = await this.redisService.get(`user-${requestToken}`);
//     const user: TCachedUser | undefined = userString
//       ? JSON.parse(userString)
//       : undefined;

//     if (!user) {
//       return null;
//     }

//     // Check for blacklisted domain
//     if (blackListDomain.includes(user.email.split('@')[1])) {
//       const dbUser = await this.prismaService.user.findUnique({
//         where: { id: user.id },
//         select: { id: true, email: true, primaryAccountId: true },
//       });

//       if (dbUser && dbUser.primaryAccountId && dbUser.primaryAccountId !== user.accountId) {
//         // Clear cookie from browser
//         request.res.clearCookie(key, {
//           path: '/',
//           httpOnly: true,
//           secure: process.env.NODE_ENV === 'production',
//         });

//         // Optionally delete from Redis
//         await this.redisService.del(`user-${requestToken}`);

//         // Force logout
//         return null; // will trigger Unauthorized in canActivate
//       }
//     }

//     return user;
//   }

// }
