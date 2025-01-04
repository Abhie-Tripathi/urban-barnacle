import { Module } from '@nestjs/common';
import { OtpEmailWorkerClass } from './bull-otp.service';
import { AccessEmailWorkerClass } from './bull-access.service';
import { EventWorkerClass } from './bull-event.service';

@Module({
  exports: [OtpEmailWorkerClass, AccessEmailWorkerClass,EventWorkerClass],
  providers: [OtpEmailWorkerClass, AccessEmailWorkerClass,EventWorkerClass],
})
export class BullQueueModule {}
