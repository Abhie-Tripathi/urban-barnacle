import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CountQueryDto, EventsTrendsDto, QueryDto } from './dto';
import { AuthGuard } from 'src/user/auth/guard';
import { TCachedUser } from 'src/utils/types';
import { GetUser } from 'src/user/decorator';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(AuthGuard)
  @Get()
  async getAllEvents(@Query() query: QueryDto, @GetUser('id') userId: string) {
    try {
      const events = await this.eventsService.getAllEvents(query, true, userId);
      return events;
    } catch (error) {
      return {
        error,
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get('/count')
  async getEventCount(@Query() query: CountQueryDto) {
    try {
      const count = await this.eventsService.getEventsCount(query);
      return count;
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
      return trends;
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
      return pocs;
    } catch (error) {
      return {
        error,
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/editions')
  async getEventEditions(@Param('id') id: string) {
    try {
      const editions = await this.eventsService.getEventEditions(id);
      return editions;
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
      return coorganizers;
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
      return rankings;
    } catch (error) {
      return {
        error,
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/speakers')
  async getEventSpeakers(@Param('id') id: string) {
    try {
      const speakers = await this.eventsService.getEventSpeakers(id);
      return speakers;
    } catch (error) {
      return {
        error,
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/sponsors')
  async getEventSponsors(@Param('id') id: string) {
    try {
      const sponsors = await this.eventsService.getEventSponsors(id);
      return sponsors;
    } catch (error) {
      return { error };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/exhibitors')
  async getEventExhibitors(@Param('id') id: string) {
    try {
      const exhibitors = await this.eventsService.getEventExhibitors(id);
      return exhibitors;
    } catch (error) {
      return { error };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/polygons')
  async getEventPolygons(@Param('id') id: string) {
    try {
      const polygons = await this.eventsService.getEventPolygons(id);
      return polygons;
    } catch (error) {
      return { error };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  async getEvent(@Param('id') id: string, @GetUser('id') userId: string) {
    try {
      const event = await this.eventsService.getEvent(userId, id);
      return event;
    } catch (error) {
      return {
        error,
      };
    }
  }
}
