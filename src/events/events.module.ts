import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsDataService } from './events.data.service';
import { IntentDataService } from 'src/intent/intent.data.service';
import { TrackerDataService } from 'src/tracker/tracker.data.service';
import { EnquiryService } from 'src/enquiry/enquiry.service';
import { EnquiryDataService } from 'src/enquiry/enquiry.data.service';
import { UserDataService } from 'src/user/user.data.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService, EventsDataService, IntentDataService, TrackerDataService, EnquiryService,
    EnquiryDataService,
    UserDataService,
  ],
  exports: [EventsService, EventsDataService],
})
export class EventsModule { }
