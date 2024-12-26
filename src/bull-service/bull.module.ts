import { Module } from '@nestjs/common';
import { OtpEmailWorkerClass } from './otp.service';

@Module({
  exports: [OtpEmailWorkerClass],
  providers: [OtpEmailWorkerClass],
})
export class BullModule {}
