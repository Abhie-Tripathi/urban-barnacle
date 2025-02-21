import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsDataService } from './events.data.service';
import { IntentDataService } from 'src/intent/intent.data.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService, EventsDataService, IntentDataService],
  exports: [EventsService, EventsDataService],
})
export class EventsModule { }
