import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CountQueryDto, EventsTrendsDto, PocsUnmaskDto, QueryDto } from './dto';
import { AuthGuard } from 'src/user/auth/guard';
import { TCachedUser } from 'src/utils/types';
import { GetUser } from 'src/user/decorator';
import { LimitDto } from 'src/global_dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(AuthGuard)
  @Get()
  async getAllEvents(@Query() query: QueryDto, @GetUser() user: TCachedUser) {
    try {
      const events = await this.eventsService.getAllEvents(query, true, user);
      return { data: events };
    } catch (error) {
      return {
        error,
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/pocs/:pocId')
  async getEventPocsUnmasked(
    @Param('id') id: string,
    @Param('pocId') pocId: string,
    @Query() query: PocsUnmaskDto,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const polygons = await this.eventsService.getEventPocsUnmasked(
        id,
        pocId,
        query,
        user,
      );
      return { data: polygons };
    } catch (error) {
      return { error };
    }
  }
  @UseGuards(AuthGuard)
  @Get('/count')
  async getEventCount(@Query() query: CountQueryDto) {
    try {
      const count = await this.eventsService.getEventsCount(query);
      return { data: count };
    } catch (error) {
      return {
        error,
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get('/trends')
  async getEventsTrends(@Query() query: EventsTrendsDto) {
    try {
      const trends = await this.eventsService.getEventsTrends(query);
      return { data: trends };
    } catch (error) {
      return {
        error,
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/pocs')
  async getEventPocs(@Param('id') id: string) {
    try {
      const pocs = await this.eventsService.getEventPocs(id);
      return { data: pocs };
    } catch (error) {
      return {
        error,
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/editions')
  async getEventEditions(@Param('id') id: string, @Query() query: LimitDto) {
    try {
      const editions = await this.eventsService.getEventEditions(id, query);
      return { data: editions };
    } catch (error) {
      return {
        error,
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/coorganizers')
  async getEventCoorganizers(@Param('id') id: string) {
    try {
      const coorganizers = await this.eventsService.getEventCoorganizers(id);
      return { data: coorganizers };
    } catch (error) {
      return {
        error,
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/rankings')
  async getEventRankings(@Param('id') id: string) {
    try {
      const rankings = await this.eventsService.getEventRankings(id);
      return { data: rankings };
    } catch (error) {
      return {
        error,
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/speakers')
  async getEventSpeakers(@Param('id') id: string, @Query() query: LimitDto) {
    try {
      const speakers = await this.eventsService.getEventSpeakers(id, query);
      return { data: speakers };
    } catch (error) {
      return {
        error,
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/sponsors')
  async getEventSponsors(@Param('id') id: string, @Query() query: LimitDto) {
    try {
      const sponsors = await this.eventsService.getEventSponsors(id, query);
      return { data: sponsors };
    } catch (error) {
      return { error };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/exhibitors')
  async getEventExhibitors(@Param('id') id: string, @Query() query: LimitDto) {
    try {
      const exhibitors = await this.eventsService.getEventExhibitors(id, query);
      return { data: exhibitors };
    } catch (error) {
      return { error };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/polygons')
  async getEventPolygons(@Param('id') id: string) {
    try {
      const polygons = await this.eventsService.getEventPolygons(id);
      return { data: polygons };
    } catch (error) {
      return { error };
    }
  }
  @UseGuards(AuthGuard)
  @Get(':id')
  async getEvent(@Param('id') id: string, @GetUser() user: TCachedUser) {
    try {
      const event = await this.eventsService.getEvent(id, user);
      return { data: event };
    } catch (error) {
      return {
        error,
      };
    }
  }
}
