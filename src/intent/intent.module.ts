import { Module } from '@nestjs/common';
import { IntentController } from './intent.controller';
import { IntentService } from './intent.service';
import { IntentDataService } from './intent.data.service';
import { EventsModule } from 'src/events/events.module';
import { EnquiryModule } from 'src/enquiry/enquiry.module';

@Module({
  controllers: [IntentController],
  providers: [IntentService, IntentDataService],
  exports: [IntentService, IntentDataService],
  imports: [EnquiryModule, EventsModule],
})
export class IntentModule {}
