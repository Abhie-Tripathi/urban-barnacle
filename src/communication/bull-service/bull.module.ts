import { Global, Module } from '@nestjs/common';
import { OtpEmailWorkerClass } from './bull-otp.service';
import { AccessEmailWorkerClass } from './bull-access.service';
import { EventWorkerClass } from './bull-event.service';
import { IntendWorkerClass } from './bull-intend.service';
import { InvitationWorkerClass } from './bull-invitation.service';
import { ErrorWorkerClass } from './bull-errorMessage.service';
import { ContactWorkerClass } from './bull-contact.service';
import { ExportWorkerClass } from './bull-export.service';
@Global()
@Module({
  exports: [
    OtpEmailWorkerClass,
    AccessEmailWorkerClass,
    EventWorkerClass,
    IntendWorkerClass,
    InvitationWorkerClass,
    ErrorWorkerClass,
    ContactWorkerClass,
    ExportWorkerClass
  ],
  providers: [
    OtpEmailWorkerClass,
    AccessEmailWorkerClass,
    EventWorkerClass,
    IntendWorkerClass,
    InvitationWorkerClass,
    ErrorWorkerClass,
    ContactWorkerClass,
    ExportWorkerClass
  ],
})
export class BullQueueModule { }
