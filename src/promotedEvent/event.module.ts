import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { PosterService } from './poster.service';
import { BullModule } from '@nestjs/bull';
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'eventProcessor',
    }),
  ],
  providers: [EventService, PosterService],
  controllers: [EventController],
})
export class EventModule {}
