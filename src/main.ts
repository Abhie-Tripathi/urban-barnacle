import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import * as fastifyCookie from '@fastify/cookie';
import { CorsGaurd } from './guard/corsgaurd';
import { GlobalResponseInterceptor } from './global-response.interceptor';

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
  const port = configService.get('PORT') || 2000;
  const origin = JSON.parse(configService.get('ORIGIN') ?? '[]');

  // CORS and Guards
  app.useGlobalGuards(new CorsGaurd(configService));
  app.enableCors({
    credentials: true,
    origin,
    allowedHeaders: 'Content-Type,Authorization',
  });

  // Cookie parser setup (needed for general cookie support)
  app.use(cookieParser(configService.get('COOKIE_SECRET')));

  // Register fastifyCookie with the correct type
  await app.register(fastifyCookie, {
    secret: JSON.stringify(configService.get('COOKIE_SECRET')) || 'My-Key',
    parseOptions: {
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      signed: true,
      path: '/',
      domain: configService.get('DOMAIN'),
    },
  });
  app.useGlobalInterceptors(new GlobalResponseInterceptor());
  // Zod validation pipe
  app.useGlobalPipes(new ZodValidationPipe());

  // Start server
  await app.listen(port);
}

bootstrap();
