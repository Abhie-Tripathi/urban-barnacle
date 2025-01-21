import { Module } from '@nestjs/common';
import { WidgetsController } from './widgets.controller';
import { WidgetsService } from './widgets.service';
import { KitController } from './kit.controller';
import { KitService } from './kit.service';
import { WidgetDataService } from './widget.data.service';

@Module({
  controllers: [WidgetsController, KitController],
  providers: [WidgetsService, KitService, WidgetDataService],
})
export class WidgetsModule {}
