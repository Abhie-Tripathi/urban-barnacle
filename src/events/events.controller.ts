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
  SimilarEventsDto,
  SortingDto,
  View,
} from './dto';
import { AuthGuard } from 'src/user/auth/guard';
import { eventAdvanceFields, membershipLimit, TCachedUser } from 'src/utils/types';
import { GetUser } from 'src/user/decorator';
import { LimitDto } from 'src/global_dto';
import { SharedService } from 'src/shared/shared.service';
import { PointColumn } from 'src/shared/types';
import { GetCommentsDto } from 'src/comment/dto';
import { CommentSourceModule } from '@prisma/client';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly sharedService: SharedService,
  ) { }

  @UseGuards(AuthGuard)
  @Get()
  async getAllEvents(
    @Query() query: QueryHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    let flag = false;
    let advanceDataFromResponse: boolean = false;
    let totalpointsToDeduct: number = 0;
    let point: number = 0;
    let advancePoint: number = 0;
    try {
      for (const val of query.showValues.split(',')) {
        if (eventAdvanceFields[val] === 'advance') {
          advanceDataFromResponse = true;
          break;
        }
      }
      if (!['calendar', 'suggestion', 'map'].includes(query.view)) {
        const tokens = await this.sharedService.getTokenDetails(user, query, !advanceDataFromResponse);
        point = tokens.point;
        advancePoint = tokens.advancePoint;
        query = tokens.query;
      }
      if (advanceDataFromResponse && advancePoint <= 0) {
        throw new HttpException(
          'You’ve exhausted your Advanced Search tokens. You can upgrade to a higher plan.',
          HttpStatus.TOO_MANY_REQUESTS,
          { cause: `{"advanceToken":${advancePoint > 0},"basicToken":${Math.abs(point) < (advancePoint * 0.5)}}` }
        );
      }
      const queryDto: QueryDto = {
        ...query,
        showValues:
          query.view === 'suggestion'
            ? 'suggestion'
            : query.showValues,
      };
      const events = await this.eventsService.getAllEvents(
        queryDto,
        true,
        user,
      );
      totalpointsToDeduct = Array.isArray(events.events) ? events.events.length : 1;
      if (!['calendar', 'suggestion', 'map'].includes(query.view)) {
        // console.log("aibuuuuuuuuuuuuuuuuuuusj\n", point, advancePoint);

        await this.sharedService.deductPointForRequest(
          advanceDataFromResponse ? PointColumn.advancePendingRequests : PointColumn.pendingRequests,
          user.accountId,
          advanceDataFromResponse ? advancePoint - totalpointsToDeduct : point - totalpointsToDeduct,
          // (advanceDataFromResponse ? PointColumn.advancePendingRequests : null),
          // (advanceDataFromResponse ? advancePoint - 1 : 0),
        );
        flag = true;
      }
      if (query.view !== 'map' && (query.save === undefined || query.save)) {
        this.eventsService.createLogForEncryptedQuery(queryDto, user);
      }
      return { data: events };
    } catch (error) {
      if (flag)
        this.sharedService.creditPointForRequest(
          advanceDataFromResponse ? PointColumn.advancePendingRequests : PointColumn.pendingRequests,
          user.accountId,
          totalpointsToDeduct
          // (advanceDataFromResponse ? : null),
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
  @Get('similar')
  async getSimilarEvents(@Query() query: SimilarEventsDto, @GetUser() user: TCachedUser) {
    let flag = false;
    let advanceDataFromResponse: boolean = false;
    let totalpointsToDeduct: number = 0;
    let point: number = 0;
    let advancePoint: number = 0;
    try {
      if (!['calendar', 'suggestion', 'map'].includes(query.view)) {
        const tokens = await this.sharedService.getTokenDetails(user, query);
        point = tokens.point;
        advancePoint = tokens.advancePoint;
        query = tokens.query;
      }
      const queryDto: any = {
        ...query,
        showValues: query.showValues,
      };
      for (const val of query.showValues.split(',')) {
        if (eventAdvanceFields[val] === 'advance') {
          advanceDataFromResponse = true;
          break;
        }
      }
      if (advanceDataFromResponse && advancePoint <= 0) {
        throw new HttpException(
          'You’ve exhausted your Advanced Search tokens. You can upgrade to a higher plan.',
          HttpStatus.TOO_MANY_REQUESTS,
          { cause: `{"advanceToken":${advancePoint > 0},"basicToken":${Math.abs(point) < (advancePoint * 0.5)}}` }
        );
      }
      const events = await this.eventsService.getSimilarEvents(queryDto);
      totalpointsToDeduct = Array.isArray(events.events) ? events.events.length : 1;
      // console.log("aibuuuuuuuuuuuuuuuuuuusj\n", point, advancePoint);
      if (!['calendar', 'suggestion', 'map'].includes(query.view)) {
        await this.sharedService.deductPointForRequest(
          advanceDataFromResponse ? PointColumn.advancePendingRequests : PointColumn.pendingRequests,
          user.accountId,
          advanceDataFromResponse ? advancePoint - totalpointsToDeduct : point - totalpointsToDeduct,
          // (advanceDataFromResponse ? PointColumn.advancePendingRequests : null),
          // (advanceDataFromResponse ? advancePoint - 1 : 0),
        );
        flag = true;
      }
      if (query.view !== 'map' && (query.save === undefined || query.save)) {
        this.eventsService.createLogForEncryptedQuery(queryDto, user);
      }
      return { data: events };
    } catch (error) {
      if (flag)
        this.sharedService.creditPointForRequest(
          advanceDataFromResponse ? PointColumn.advancePendingRequests : PointColumn.pendingRequests,
          user.accountId,
          totalpointsToDeduct,
          // (advanceDataFromResponse ? : null),
        );
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
      const intelscore = await this.eventsService.getEventIntelScore(id, user);
      return { data: intelscore };
    } catch (error) {
      return { error };
    }
  }
  @UseGuards(AuthGuard)
  @Get(':eventId/comments/:source?')
  async getEventComment(@Param('eventId') eventId: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetCommentsDto,
    @Param('source') source?: 'coordinate' | 'outreach',) {
    try {
      const alterSource =
        !source || source === 'coordinate'
          ? 'coordinate,EVENT_DETAIL_PAGE'
          : 'outreach';
      const comments = await this.eventsService.getEventsComment(
        user,
        eventId,
        alterSource.toUpperCase().split(',') as CommentSourceModule[],
        query,
      );
      return {
        data: comments,
      };
    } catch (error) {
      return {
        error,
      };
    }
  }
  @UseGuards(AuthGuard)
  @Get(':id')
  async getEvent(@Param('id') id: string,
    @GetUser() user: TCachedUser, @Query() query: QueryHttpDto) {
    let flag = false;
    let advanceDataFromResponse: boolean = false;
    let point: number = 0;
    let advancePoint: number = 0;
    try {
      for (const val of query.showValues.split(',')) {
        if (eventAdvanceFields[val] === 'advance') {
          advanceDataFromResponse = true;
          break;
        }
      }
      if (!['calendar', 'suggestion', 'map'].includes(query.view)) {
        const tokens = await this.sharedService.getTokenDetails(user, query, !advanceDataFromResponse);
        point = tokens.point;
        advancePoint = tokens.advancePoint;
        query = tokens.query;
      }

      if (advanceDataFromResponse && advancePoint <= 0 && point < 0) {
        throw new HttpException(
          'You’ve exhausted your Advanced Search tokens. You can upgrade to a higher plan.',
          HttpStatus.TOO_MANY_REQUESTS,
          { cause: `{"advanceToken":${advancePoint > 0},"basicToken":${Math.abs(point) < (advancePoint * 0.5)}}` }
        );
      } else if (advanceDataFromResponse && advancePoint <= 0 && point > 0) {
        advanceDataFromResponse = false;
        query.showValues = 'basic';
      }
      const event = await this.eventsService.getEvent(id, query.showValues, user);
      await this.sharedService.deductPointForRequest(
        advanceDataFromResponse ? PointColumn.advancePendingRequests : PointColumn.pendingRequests,
        user.accountId,
        advanceDataFromResponse ? advancePoint - 1 : point - 1,
        // (advanceDataFromResponse ? PointColumn.advancePendingRequests : null),
        // (advanceDataFromResponse ? advancePoint - 1 : 0),
      );
      flag = true;
      return { data: event };
    } catch (error) {
      if (flag)
        this.sharedService.creditPointForRequest(
          advanceDataFromResponse ? PointColumn.advancePendingRequests : PointColumn.pendingRequests,
          user.accountId,
          // (advanceDataFromResponse ? : null),
        );
      return {
        error,
      };
    }
  }
}
