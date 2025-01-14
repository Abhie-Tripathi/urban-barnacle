import { Module } from '@nestjs/common';
import { WidgetsController } from './widgets.controller';
import { WidgetsService } from './widgets.service';
import { EventService } from 'src/promotedEvent/event.service';
import { KitController } from './kit.controller';
import { KitService } from './kit.service';

@Module({
  controllers: [WidgetsController, KitController],
  providers: [WidgetsService, KitService],
})
export class WidgetsModule {}
