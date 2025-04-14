import { Module, forwardRef } from '@nestjs/common';
import { IntentController } from './intent.controller';
import { IntentService } from './intent.service';
import { IntentDataService } from './intent.data.service';
import { EnquiryModule } from 'src/enquiry/enquiry.module';
import { EventsModule } from 'src/events/events.module';
import { CommentService } from 'src/comment/comment.service';
import { EnquiryDataService } from 'src/enquiry/enquiry.data.service';
import { UserDataService } from 'src/user/user.data.service';
import { EnquiryService } from 'src/enquiry/enquiry.service';
import { PromotedEventsDataService } from 'src/promotedEvent/promoted-even.data.service';

@Module({
  controllers: [IntentController],
  providers: [
    IntentService,
    IntentDataService,
    EnquiryService,
    EnquiryDataService,
    UserDataService,
    PromotedEventsDataService
  ],
  exports: [IntentService, IntentDataService],
  imports: [forwardRef(() => EnquiryModule), EventsModule],
})
export class IntentModule { }
