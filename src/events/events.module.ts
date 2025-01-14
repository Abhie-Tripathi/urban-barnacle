import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsDataService } from './events.data.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService, EventsDataService],
})
export class EventsModule {}
