import { Module } from '@nestjs/common';
import { PublicApiService } from './public-api.service';
import { PublicApiController } from './public-api.controller';
import { PublicApiDataService } from './public-api.data.service';
import { WidgetsService } from 'src/widgets/widgets.service';
import { WidgetDataService } from 'src/widgets/widget.data.service';

@Module({
  controllers: [PublicApiController],
  providers: [PublicApiService, PublicApiDataService, WidgetsService, WidgetDataService],
})
export class PublicApiModule { }
