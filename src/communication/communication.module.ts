import { BullModule } from '@nestjs/bull';
import { Global, Module } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { OtpEmailWorkerClass } from './bull-service/bull-otp.service';
import { AccessEmailWorkerClass } from './bull-service/bull-access.service';
import { EventWorkerClass } from './bull-service/bull-event.service';
import { IntendWorkerClass } from './bull-service/bull-intend.service';
import { InvitationWorkerClass } from './bull-service/bull-invitation.service';
import { EmailService } from './email/email.service';

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        ...(process.env.NODE_ENV &&
          process.env.NODE_ENV.toLowerCase() !== 'production'
          ? {
            host: process.env.REDIS_HOST || '0.0.0.0',
            port: Number(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD,
          }
          : {
            tls: {
              host: process.env.REDIS_HOST || '0.0.0.0',
              port: Number(process.env.REDIS_PORT) || 6379,
            },
          }),
      },
    }),
    BullModule.registerQueue({
      name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}accessProcessor}`,
      defaultJobOptions: {
        removeOnComplete: Number(process.env.BULL_JOB_REMOVE_LIMIT || 100),
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}inviteProcessor}`,
      defaultJobOptions: {
        removeOnComplete: Number(process.env.BULL_JOB_REMOVE_LIMIT || 100),
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}eventProcessor}`,
      defaultJobOptions: {
        removeOnComplete: Number(process.env.BULL_JOB_REMOVE_LIMIT || 100),
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}otpProcessor}`,
      defaultJobOptions: {
        removeOnComplete: Number(process.env.BULL_JOB_REMOVE_LIMIT || 100),
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}intendProcessor}`,
      defaultJobOptions: {
        removeOnComplete: Number(process.env.BULL_JOB_REMOVE_LIMIT || 1000),
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}demoContactProcessor}`,
      defaultJobOptions: {
        removeOnComplete: Number(process.env.BULL_JOB_REMOVE_LIMIT || 100),
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}errorProcessor}`,
      defaultJobOptions: {
        removeOnComplete: Number(process.env.BULL_JOB_REMOVE_LIMIT || 100),
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}exportProcessor}`,
      defaultJobOptions: {
        removeOnComplete: Number(process.env.BULL_JOB_REMOVE_LIMIT || 100),
        removeOnFail: false
      }
    }),
  ],
  providers: [
    CommunicationService,
    // OtpEmailWorkerClass, ExportWorkerClass
    // AccessEmailWorkerClass,
    // EventWorkerClass,
    // IntendWorkerClass,
    // InvitationWorkerClass,
    EmailService
  ],
  exports: [CommunicationService],
})
export class CommunicationModule { }
