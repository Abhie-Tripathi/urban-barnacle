import { Module } from '@nestjs/common';
import { PromotedEventsService } from './promoted-event.service';
import { PromotedEventsController } from './promoted-event.controller';
import { PosterService } from './poster.service';
import { BullModule } from '@nestjs/bull';
import { PromotedEventsDataService } from './promoted-even.data.service';
@Module({
  providers: [PromotedEventsService, PosterService, PromotedEventsDataService],
  controllers: [PromotedEventsController],
})
export class PromotedEventsModule {}
