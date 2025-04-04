import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import {
  CountQueryDto,
  EventsTrendsDto,
  PocsUnmaskDto,
  QueryDto,
  QueryHttpDto,
  SortingDto,
  View,
} from './dto';
import { AuthGuard } from 'src/user/auth/guard';
import { TCachedUser } from 'src/utils/types';
import { GetUser } from 'src/user/decorator';
import { LimitDto } from 'src/global_dto';
import { SharedService } from 'src/shared/shared.service';
import { PointColumn } from 'src/shared/types';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly sharedService: SharedService,
  ) {}

  @UseGuards(AuthGuard)
  @Get()
  async getAllEvents(
    @Query() query: QueryHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    let flag = false;
    try {
      const point = await this.sharedService.getPointForRequest(
        PointColumn.pendingRequests,
        user.currentSubscriptionId,
      );
      if (point <= 0) {
        throw new HttpException(
          'You have reached the maximum limit to view data. Please get in touch with us.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      const queryDto: QueryDto = {
        ...query,
        showValues:
          query.view === 'suggestion'
            ? 'suggestion'
            : 'basic,advance,insights,audience',
      };
      const events = await this.eventsService.getAllEvents(
        queryDto,
        true,
        user,
      );
      if (query.view !== 'suggestion') {
        await this.sharedService.deductPointForRequest(
          PointColumn.pendingRequests,
          user.currentSubscriptionId,
          point - 1,
        );
      }
      flag = true;
      if (query.view !== 'map' && (query.save === undefined || query.save)) {
        this.eventsService.createLogForEncryptedQuery(queryDto, user);
      }
      return { data: events };
    } catch (error) {
      if (flag)
        this.sharedService.creditPointForRequest(
          PointColumn.pendingRequests,
          user.currentSubscriptionId,
        );
      return {
        error,
      };
    }
  }

  // @UseGuards(AuthGuard)
  // @Get(':id/pocs/:pocId')
  // async getEventPocsUnmasked(
  //   @Param('id') id: string,
  //   @Param('pocId') pocId: string,
  //   @Query() query: PocsUnmaskDto,
  //   @GetUser() user: TCachedUser,
  // ) {
  //   try {
  //     const polygons = await this.eventsService.getEventPocsUnmasked(
  //       id,
  //       pocId,
  //       query,
  //       user,
  //     );
  //     return { data: polygons };
  //   } catch (error) {
  //     return { error };
  //   }
  // }
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
  async getEventPocs(@Param('id') id: string, @Query() query: SortingDto) {
    try {
      const pocs = await this.eventsService.getEventPocs(id, query);
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
  @Get(':id/intelScore')
  async getEventIntelScore(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const polygons = await this.eventsService.getEventIntelScore(id, user);
      return { data: polygons };
    } catch (error) {
      return { error };
    }
  }
  @UseGuards(AuthGuard)
  @Get(':id')
  async getEvent(@Param('id') id: string, @GetUser() user: TCachedUser) {
    try {
      const showValues = 'basic,advance,insights,audience';
      const event = await this.eventsService.getEvent(id, showValues, user);
      return { data: event };
    } catch (error) {
      return {
        error,
      };
    }
  }
}
