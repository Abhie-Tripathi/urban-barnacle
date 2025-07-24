import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import * as fastifyCookie from '@fastify/cookie';
import { GlobalResponseInterceptor } from './global-response.interceptor';
import multipart from '@fastify/multipart';
import { CorsGaurd } from './corsgaurd';
import { AfterResponseInterceptor } from './after-response.interceptor';
import { PrismaService } from './prisma/prisma.service';
// import { AuthGuard } from './user/auth/guard';
// import { CACHE_MANAGER } from '@nestjs/cache-manager';
// import { RedisService } from './redis/redis.service';
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Register Static Files
  app.register(fastifyStatic, {
    root: [
      join(__dirname, '..', 'public/temp/'),
      join(__dirname, '..', 'public/export/'),
    ],
    prefix: '/public/',
  });

  // Config Service
  const configService = app.get(ConfigService);
  const port = configService.get('PORT');
  const origin = JSON.parse(configService.get('ORIGIN') ?? '[]');

  // CORS and Guards
  app.useGlobalGuards(new CorsGaurd(configService));
// app.useGlobalGuards(app.get(AuthGuard));

  app.enableCors({
    credentials: true,
    origin,
    allowedHeaders: 'Content-Type,Authorization',
  });

  // Cookie parser setup (needed for general cookie support)
  app.use(cookieParser(configService.get('COOKIE_SECRET')));
  await app.register(multipart);
  // Register fastifyCookie with the correct type
  // const node_env = configService.get('NODE_ENV') || 'development';
  await app.register(fastifyCookie, {
    secret: JSON.stringify(configService.get('COOKIE_SECRET')),
    parseOptions: {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      signed: true,
      path: '/',
      domain: configService.get('DOMAIN'),
    },
  });
  app.useGlobalInterceptors(
    new AfterResponseInterceptor(app.get(PrismaService)),
  );
  app.useGlobalInterceptors(app.get(GlobalResponseInterceptor));
  // Zod validation pipe
  app.useGlobalPipes(new ZodValidationPipe());

  // Start server
  await app.listen(port);
}

bootstrap();
