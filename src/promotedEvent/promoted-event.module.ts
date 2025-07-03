import { Module } from '@nestjs/common';
import { PromotedEventsService } from './promoted-event.service';
import { PromotedEventsController } from './promoted-event.controller';
import { PosterService } from './poster.service';
import { PromotedEventsDataService } from './promoted-even.data.service';
import { IntentService } from 'src/intent/intent.service';
import { IntentDataService } from 'src/intent/intent.data.service';
import { TrackerDataService } from 'src/tracker/tracker.data.service';
import { EventsDataService } from 'src/events/events.data.service';
import { EnquiryService } from 'src/enquiry/enquiry.service';
import { EventsService } from 'src/events/events.service';
import { EnquiryDataService } from 'src/enquiry/enquiry.data.service';
import { UserDataService } from 'src/user/user.data.service';
@Module({
  providers: [PromotedEventsService, PosterService, PromotedEventsDataService, IntentService,
    IntentDataService, EnquiryService, EventsService, EnquiryDataService, UserDataService,
    EventsDataService, TrackerDataService],
  controllers: [PromotedEventsController],
})
export class PromotedEventsModule { }
