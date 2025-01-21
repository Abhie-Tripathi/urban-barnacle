import { Global, Module } from '@nestjs/common';
import { OtpEmailWorkerClass } from './bull-otp.service';
import { AccessEmailWorkerClass } from './bull-access.service';
import { EventWorkerClass } from './bull-event.service';
import { IntendWorkerClass } from './bull-intend.service';
import { InvitationWorkerClass } from './bull-invitation.service';
@Global()
@Module({
  exports: [
    OtpEmailWorkerClass,
    AccessEmailWorkerClass,
    EventWorkerClass,
    IntendWorkerClass,
    InvitationWorkerClass,
  ],
  providers: [
    OtpEmailWorkerClass,
    AccessEmailWorkerClass,
    EventWorkerClass,
    IntendWorkerClass,
    InvitationWorkerClass,
  ],
})
export class BullQueueModule {}
