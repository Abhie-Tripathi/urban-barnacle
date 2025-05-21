import { BullModule } from '@nestjs/bull';
import { Global, Module } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { OtpEmailWorkerClass } from './bull-service/bull-otp.service';
import { AccessEmailWorkerClass } from './bull-service/bull-access.service';
import { EventWorkerClass } from './bull-service/bull-event.service';
import { IntendWorkerClass } from './bull-service/bull-intend.service';
import { InvitationWorkerClass } from './bull-service/bull-invitation.service';

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: '0.0.0.0',
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    BullModule.registerQueue({
      name: 'accessProcessor',
      defaultJobOptions: {
        removeOnComplete: Number(process.env.BULL_JOB_REMOVE_LIMIT || 100),
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: 'inviteProcessor',
      defaultJobOptions: {
        removeOnComplete: Number(process.env.BULL_JOB_REMOVE_LIMIT || 100),
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: 'eventProcessor',
      defaultJobOptions: {
        removeOnComplete: Number(process.env.BULL_JOB_REMOVE_LIMIT || 100),
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: 'otpProcessor',
      defaultJobOptions: {
        removeOnComplete: Number(process.env.BULL_JOB_REMOVE_LIMIT || 100),
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: 'intendProcessor',
      defaultJobOptions: {
        removeOnComplete: Number(process.env.BULL_JOB_REMOVE_LIMIT || 1000),
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: 'demoContactProcessor',
      defaultJobOptions: {
        removeOnComplete: Number(process.env.BULL_JOB_REMOVE_LIMIT || 100),
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: 'errorProcessor',
      defaultJobOptions: {
        removeOnComplete: Number(process.env.BULL_JOB_REMOVE_LIMIT || 100),
        removeOnFail: false,
      },
    }),
  ],
  providers: [
    CommunicationService,
    // OtpEmailWorkerClass,
    // AccessEmailWorkerClass,
    // EventWorkerClass,
    // IntendWorkerClass,
    // InvitationWorkerClass,
  ],
  exports: [CommunicationService],
})
export class CommunicationModule { }
