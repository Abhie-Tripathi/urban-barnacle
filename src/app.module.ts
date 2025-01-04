import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { SharedModule } from './shared/shared.module';
import { BullModule } from '@nestjs/bull';
import { RequestLoggingMiddleware } from './request-logging.middleware';
import { LoggingMiddleware } from './logging.interceptor';
import { CategoryModule } from './category/category.module';
import { CompanyModule } from './company/company.module';
import { UserInterestModule } from './user-interest/user-interest.module';
import { EmailModule } from './communication/email/email.module';
import { OtpEmailWorkerClass } from './communication/bull-service/bull-otp.service';
import { EmailService } from './communication/email/email.service';
import { AccessEmailWorkerClass } from './communication/bull-service/bull-access.service';
import { EventModule } from './event/event.module';
import { WidgetsModule } from './widgets/widgets.module';
import { EventWorkerClass } from './communication/bull-service/bull-event.service';
import { InviteModule } from './invite/invite.module';

@Module({
  imports: [
    // ConfigModule to manage environment variables
    ConfigModule.forRoot({ isGlobal: true }),

    // BullModule for queue handling
    BullModule.forRoot({
      redis: {
        host: '0.0.0.0',
        port: 6379,
        password: process.env.REDIS_PASSWORD,
      },
    }),

    // PrismaModule for database handling
    PrismaModule,

    // CacheModule for Redis-based caching
    CacheModule.register({
      store: redisStore,
      socket: {
        host: '0.0.0.0',
        port: 6379,
      },
      isGlobal: true,
      password: process.env.REDIS_PASSWORD,
      no_ready_check: false,
    }),

    // Other application modules
    UserModule,
    SharedModule,
    EmailModule,
    BullModule,
    CategoryModule,
    CompanyModule,
    UserInterestModule,
    EventModule,
    WidgetsModule,
    InviteModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    OtpEmailWorkerClass,
    EmailService,
    AccessEmailWorkerClass,
    EventWorkerClass,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
