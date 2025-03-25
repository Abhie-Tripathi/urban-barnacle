import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { AccessModule } from 'src/access/access.module';
import { IntentModule } from 'src/intent/intent.module';
import { CommentDataService } from './comment.data.service';
import { IntentDataService } from 'src/intent/intent.data.service';
import { IntentService } from 'src/intent/intent.service';
import { EnquiryService } from 'src/enquiry/enquiry.service';
import { EventsService } from 'src/events/events.service';
import { EnquiryDataService } from 'src/enquiry/enquiry.data.service';
import { UserDataService } from 'src/user/user.data.service';
import { EventsDataService } from 'src/events/events.data.service';
import { TrackerDataService } from 'src/tracker/tracker.data.service';

@Module({
  providers: [
    CommentService,
    CommentDataService,
    IntentDataService,
    IntentService,
    EnquiryService,
    EventsService,
    EnquiryDataService,
    UserDataService,
    EventsDataService,
    TrackerDataService
  ],
  controllers: [CommentController],
  imports: [AccessModule],
  exports: [CommentService, CommentDataService],
})
export class CommentModule { }
