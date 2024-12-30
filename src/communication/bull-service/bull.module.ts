import { Module } from '@nestjs/common';
import { OtpEmailWorkerClass } from './bull-otp.service';
import { AccessEmailWorkerClass } from './bull-access.service';

@Module({
  exports: [OtpEmailWorkerClass, AccessEmailWorkerClass],
  providers: [OtpEmailWorkerClass, AccessEmailWorkerClass],
})
export class BullQueueModule {}
