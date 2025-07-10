import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { PublicApiService } from './public-api.service';
import { Query_Dto } from 'src/promotedEvent/dto';
import { QueryDto, QueryHttpDto } from 'src/events/dto';
import { QueryFilterDto } from './dto';

@Controller('public')
export class PublicApiController {
  constructor(private readonly service: PublicApiService) { }
  @Get('widget/:id')
  async getWidget(
    @Param('id') id,
    @Req() req: FastifyRequest,
    @Query() query: Query_Dto,
  ) {
    try {
      const result = this.service.getWidgetById(id, req, query);
      return result;
    } catch (error) {
      return {
        error,
      };
    }
  }

  @Get('account/:accountId/events')
  async getCompanyEvents(@Param('accountId') id, @Query() query: Query_Dto) {
    try {
      const result = this.service.getCompanyEvents(id, query);
      return result;
    } catch (error) {
      return {
        error,
      };
    }
  }
  @Get('event/:id')
  async getWidgetEvents(@Param('id') id) {
    try {
      const result = this.service.getWidgetEventById(id);
      return result;
    } catch (error) {
      return {
        error,
      };
    }
  }
  @Get('events')
  async getpresetEvents(@Query() query: QueryFilterDto) {
    try {
      const queryDto: QueryDto = {
        ...query,
        showValues:
          query.view === 'suggestion'
            ? 'suggestion'
            : 'basic,advance,insights,audience',
      };
      const result = await this.service.getPresetEvents(queryDto);
      return { data: result };
    } catch (error) {
      return {
        error,
      };
    }
  }
}
