import { Global, Module } from '@nestjs/common';
import { OtpEmailWorkerClass } from './bull-otp.service';
import { AccessEmailWorkerClass } from './bull-access.service';
import { EventWorkerClass } from './bull-event.service';
import { IntendWorkerClass } from './bull-intend.service';
import { InvitationWorkerClass } from './bull-invitation.service';
import { DemoContactWorkerClass } from './bull-demoContact.service';
import { ErrorWorkerClass } from './bull-errorMessage.service';
@Global()
@Module({
  exports: [
    OtpEmailWorkerClass,
    AccessEmailWorkerClass,
    EventWorkerClass,
    IntendWorkerClass,
    InvitationWorkerClass,
    DemoContactWorkerClass,
    ErrorWorkerClass
  ],
  providers: [
    OtpEmailWorkerClass,
    AccessEmailWorkerClass,
    EventWorkerClass,
    IntendWorkerClass,
    InvitationWorkerClass,
    DemoContactWorkerClass,
    ErrorWorkerClass
  ],
})
export class BullQueueModule { }
