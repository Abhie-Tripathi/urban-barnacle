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
// import { LoggingMiddleware } from './logging.interceptor';
import { PromotedEventsModule } from './promotedEvent/promoted-event.module';
import { WidgetsModule } from './widgets/widgets.module';
import { InviteModule } from './invite/invite.module';
import { SuggestionModule } from './suggestion/suggestion.module';
import { EventsModule } from './events/events.module';
import { TrackerModule } from './tracker/tracker.module';
import { EnquiryModule } from './enquiry/enquiry.module';
import { IntentModule } from './intent/intent.module';
import { CommentModule } from './comment/comment.module';
import { AccessModule } from './access/access.module';
import { ExportsModule } from './exports/exports.module';
import { SavedLocationModule } from './saved-location/saved-location.module';
import { MeModule } from './user/me/me.module';
import { CompanyModule } from './user/company/company.module';
import { AccountModule } from './user/account/account.module';
import { CommunicationModule } from './communication/communication.module';
import { IntendModule } from './intend/intend.module';
import { EmailService } from './communication/email/email.service';
import { OtpEmailWorkerClass } from './communication/bull-service/bull-otp.service';
import { AccessEmailWorkerClass } from './communication/bull-service/bull-access.service';
import { EventWorkerClass } from './communication/bull-service/bull-event.service';
import { IntendWorkerClass } from './communication/bull-service/bull-intend.service';
import { InvitationWorkerClass } from './communication/bull-service/bull-invitation.service';
import { AfterResponseInterceptor } from './after-response.interceptor';
import { PublicApiModule } from './public-api/public-api.module';

@Module({
  imports: [
    // ConfigModule to manage environment variables
    ConfigModule.forRoot({ isGlobal: true }),

    // // BullModule for queue handling
    // BullModule.forRoot({
    //   redis: {
    //     host: '0.0.0.0',
    //     port: 6379,
    //     password: process.env.REDIS_PASSWORD,
    //   },
    // }),

    // PrismaModule for database handling
    PrismaModule,

    // CacheModule for Redis-based caching
    CacheModule.register({
      store: redisStore,
      socket: {
        host: '0.0.0.0',
        port: process.env.REDIS_PORT,
      },
      isGlobal: true,
      password: process.env.REDIS_PASSWORD,
      no_ready_check: false,
    }),

    // Other application modules
    UserModule,
    SharedModule,
    BullModule,
    PromotedEventsModule,
    WidgetsModule,
    InviteModule,
    SuggestionModule,
    EventsModule,
    TrackerModule,
    EnquiryModule,
    IntentModule,
    CommentModule,
    AccessModule,
    ExportsModule,
    SavedLocationModule,
    MeModule,
    CompanyModule,
    AccountModule,
    CommunicationModule,
    IntendModule,
    PublicApiModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    EmailService,
    OtpEmailWorkerClass,
    AccessEmailWorkerClass,
    EventWorkerClass,
    IntendWorkerClass,
    InvitationWorkerClass,
    AfterResponseInterceptor,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
    // consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
