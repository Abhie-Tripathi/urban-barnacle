import { Module } from '@nestjs/common';
import { PublicApiService } from './public-api.service';
import { PublicApiController } from './public-api.controller';
import { PublicApiDataService } from './public-api.data.service';
import { WidgetsService } from 'src/widgets/widgets.service';
import { WidgetDataService } from 'src/widgets/widget.data.service';
import { EventsService } from 'src/events/events.service';
import { EventsDataService } from 'src/events/events.data.service';
import { IntentDataService } from 'src/intent/intent.data.service';
import { EnquiryService } from 'src/enquiry/enquiry.service';
import { TrackerDataService } from 'src/tracker/tracker.data.service';
import { EnquiryDataService } from 'src/enquiry/enquiry.data.service';
import { UserDataService } from 'src/user/user.data.service';

@Module({
  controllers: [PublicApiController],
  providers: [PublicApiService, PublicApiDataService, WidgetsService, WidgetDataService, EventsService,EventsDataService,
    IntentDataService,EnquiryService,TrackerDataService,EnquiryDataService,UserDataService],
})
export class PublicApiModule { }
