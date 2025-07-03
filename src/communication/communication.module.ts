import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { EmailService } from './email/email.service';
@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        ...(process.env.NODE_ENV &&
          process.env.NODE_ENV.toLowerCase() !== 'production' ? {
          host: process.env.REDIS_HOST || '0.0.0.0',
          port: Number(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD,
        } : {
          host: process.env.REDIS_HOST || '0.0.0.0',
          port: Number(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD, tls: {}
        })
      },
      defaultJobOptions: {
        removeOnComplete: Number(process.env.BULL_JOB_REMOVE_LIMIT || 100),
        removeOnFail: 1000,
      },
    }),
    BullModule.registerQueue({
      name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}accessProcessor}`,
    }),
    BullModule.registerQueue({
      name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}inviteProcessor}`,
    }),
    BullModule.registerQueue({
      name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}eventProcessor}`,
    }),
    BullModule.registerQueue({
      name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}otpProcessor}`,
    }),
    BullModule.registerQueue({
      name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}intendProcessor}`,
    }),
    BullModule.registerQueue({
      name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}demoContactProcessor}`,
    }),
    // BullModule.registerQueue({
    //   name: 'demoContactProcessor',
    // }),
    BullModule.registerQueue({
      name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}errorProcessor}`,
    }),
    BullModule.registerQueue({
      name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}exportProcessor}`,
    }),
    BullModule.registerQueue({
      name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}contactProcessor}`,
    }),
  ],
  providers: [
    CommunicationService,
    EmailService
  ],
  exports: [CommunicationService],
})
export class CommunicationModule { }
