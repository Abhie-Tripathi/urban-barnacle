import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TrackerService } from './tracker.service';
import {
  CreateTrackerDto,
  CreateTrackerExportsDto,
  GetTrackerByIdDto,
  GetTrackerEventsCountDto,
  GetTrackerEventsDto,
  GetTrackerIntelScoreDto,
  GetTrackerUsersDto,
  SimilarTrackerEventDto,
  UpdateTrackerDto,
  UpdateTrackerHttpDto,
} from './dto';
import { GetUser } from 'src/user/decorator';
import { eventAdvanceFields, membershipLimit, TCachedUser } from 'src/utils/types';
import { AuthGuard } from 'src/user/auth/guard';
import { GetCommentsDto } from 'src/comment/dto';
import { CreateAccessHttpDto, UpdateAccessHttpDto } from 'src/access/dto';
import { LimitDto } from 'src/global_dto';
import { SharedService } from 'src/shared/shared.service';
import { PointColumn } from 'src/shared/types';

@Controller('trackers')
export class TrackerController {
  constructor(
    private readonly trackerService: TrackerService,
    private readonly sharedService: SharedService,
  ) { }

  @UseGuards(AuthGuard)
  @Post()
  async createTracker(
    @Body() data: CreateTrackerDto,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const tracker = await this.trackerService.createTracker(user, data);
      return { data: tracker };
    } catch (error) {
      console.log(error);
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Post(':id/access')
  async createAccess(
    @Body() data: CreateAccessHttpDto,
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const access = await this.trackerService.createTrackerAccess(
        user,
        id,
        data,
      );
      return { data: access };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':id/access/:accessId')
  async deleteAccess(
    @Param('id') id: string,
    @Param('accessId') accessId: string,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const access = await this.trackerService.deleteTrackerAccess(
        user,
        id,
        accessId,
      );
      return { data: access };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Patch(':id/access/:accessId')
  async updateAccess(
    @Param('id') id: string,
    @Param('accessId') accessId: string,
    @Body() data: UpdateAccessHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const access = await this.trackerService.updateTrackerAccess(
        user,
        id,
        accessId,
        data,
      );
      return { data: access };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  async updateTracker(
    @Param('id') id: string,
    @Body() data: UpdateTrackerHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const tracker = await this.trackerService.updateTracker(user, id, data);
      return { data: tracker };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async deleteTracker(@Param('id') id: string, @GetUser() user: TCachedUser) {
    try {
      const tracker = await this.trackerService.deleteTracker(user, id);
      return { data: tracker };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/events')
  async getTrackerEvents(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackerEventsDto,
  ) {
    let flag = false;
    let advanceDataFromResponse: boolean = false;
    let totalpointsToDeduct: number = 0;
    let point: number = 0;
    let advancePoint: number = 0;
    let isAdvanceFilterUsed: boolean = false;
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
        isAdvanceFilterUsed = tokens.isAdvanceFilterUsed;
      }
      if ((advanceDataFromResponse || isAdvanceFilterUsed) && advancePoint <= 0) {
        throw new HttpException(
          'You’ve exhausted your Advanced Search tokens. You can upgrade to a higher plan.',
          HttpStatus.TOO_MANY_REQUESTS,
          { cause: `{"advanceToken":${advancePoint > 0},"basicToken":${Math.abs(point) < (advancePoint * 0.5)}}` }
        );
      }
      const events = await this.trackerService.getTrackerEvents(
        user,
        id,
        query,
        query.showValues,
      );
      totalpointsToDeduct = Array.isArray(events.events) ? events.events.length : 1;
      advanceDataFromResponse = events.isAdvanceFilterUsed ?? false;
      delete events['isAdvanceFilterUsed'];
      if (!['calendar', 'suggestion', 'map'].includes(query.view)) {
        // console.log("aibuuuuuuuuuuuuuuuuuuusj\n", point, advancePoint);

        await this.sharedService.deductPointForRequest(
          (advanceDataFromResponse || isAdvanceFilterUsed) ? PointColumn.advancePendingRequests : PointColumn.pendingRequests,
          user.accountId,
          (advanceDataFromResponse || isAdvanceFilterUsed) ? advancePoint - totalpointsToDeduct : point - totalpointsToDeduct,
          // (advanceDataFromResponse ? PointColumn.advancePendingRequests : null),
          // (advanceDataFromResponse ? advancePoint - 1 : 0),
        );
        flag = true;
      }
      return {
        data: (events["events"] && typeof events["events"] === "object" && !Array.isArray(events["events"]))
          ? events["events"]
          : events
      };

    } catch (error) {
      if (flag)
        this.sharedService.creditPointForRequest(
          (advanceDataFromResponse || isAdvanceFilterUsed) ? PointColumn.advancePendingRequests : PointColumn.pendingRequests,
          user.accountId,
          totalpointsToDeduct
          // (advanceDataFromResponse ? : null),
        );
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/events/count')
  async getTrackerEventsCount(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackerEventsCountDto,
  ) {
    try {
      const events = await this.trackerService.getTrackerEventsCount(
        user,
        id,
        query,
      );
      return { data: events };
    } catch (error) {
      return { error: error };
    }
  }
  @UseGuards(AuthGuard)
  @Get(':id/intelScore')
  async getTrackerIntelScore(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackerIntelScoreDto,
  ) {
    try {
      const events = await this.trackerService.getTrackerIntelScore(
        user,
        id,
        query,
      );
      return { data: events };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/events/similar')
  async getTrackerSimilarEvents(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackerEventsDto,
  ) {
    let flag = false;
    let advanceDataFromResponse: boolean = false;
    let totalpointsToDeduct: number = 0;
    let point: number = 0;
    let advancePoint: number = 0;
    let isAdvanceFilterUsed: boolean = false;
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
        isAdvanceFilterUsed = tokens.isAdvanceFilterUsed;
      }
      if ((advanceDataFromResponse || isAdvanceFilterUsed) && advancePoint <= 0) {
        throw new HttpException(
          'You’ve exhausted your Advanced Search tokens. You can upgrade to a higher plan.',
          HttpStatus.TOO_MANY_REQUESTS,
          { cause: `{"advanceToken":${advancePoint > 0},"basicToken":${Math.abs(point) < (advancePoint * 0.5)}}` }
        );
      }

      const events = await this.trackerService.getTrackerSimilarEvents(
        user,
        id,
        query,
        query.showValues,
      );
      totalpointsToDeduct = Array.isArray(events.events) ? events.events.length : 1;
      advanceDataFromResponse = events.isAdvanceFilterUsed ?? false;
      delete events['isAdvanceFilterUsed'];
      if (!['calendar', 'suggestion', 'map'].includes(query.view)) {
        // console.log("aibuuuuuuuuuuuuuuuuuuusj\n", point, advancePoint);

        await this.sharedService.deductPointForRequest(
          (advanceDataFromResponse || isAdvanceFilterUsed) ? PointColumn.advancePendingRequests : PointColumn.pendingRequests,
          user.accountId,
          (advanceDataFromResponse || isAdvanceFilterUsed) ? advancePoint - totalpointsToDeduct : point - totalpointsToDeduct,
          // (advanceDataFromResponse ? PointColumn.advancePendingRequests : null),
          // (advanceDataFromResponse ? advancePoint - 1 : 0),
        );
        flag = true;
      }
      return {
        data: (events["events"] && typeof events["events"] === "object" && !Array.isArray(events["events"]))
          ? events["events"]
          : events
      };
    } catch (error) {
      if (flag)
        this.sharedService.creditPointForRequest(
          (advanceDataFromResponse || isAdvanceFilterUsed) ? PointColumn.advancePendingRequests : PointColumn.pendingRequests,
          user.accountId,
          totalpointsToDeduct
          // (advanceDataFromResponse ? : null),
        );
      return { error: error };
    }
  }
  @UseGuards(AuthGuard)
  @Get(':id/events/similar/count')
  async getTrackerSimilarEventsCount(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackerEventsCountDto,
  ) {
    try {
      const events = await this.trackerService.getTrackerSimilarEventsCount(
        user,
        id,
        query,
      );
      return { data: events['data'] };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/saved-events')
  async getTrackerSavedEvents(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackerEventsDto,
  ) {
    try {
      const events = await this.trackerService.getTrackerSavedEvents(
        user,
        id,
        query,
        query.showValues,
      );
      return { data: events };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/saved-events/count')
  async getTrackerSavedEventsCount(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackerEventsCountDto,
  ) {
    try {
      const events = await this.trackerService.getTrackerSavedEventsCount(
        user,
        id,
        query,
      );
      return { data: events };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/users')
  async getTrackerUsers(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackerUsersDto,
  ) {
    try {
      const users = await this.trackerService.getTrackerUsers(user, id, query);
      return { data: users };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/comments')
  async getTrackerComments(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetCommentsDto,
  ) {
    try {
      const comments = await this.trackerService.getTrackerComments(
        user,
        id,
        query,
      );
      return { data: comments };
    } catch (error) {
      return { error: error };
    }
  }
  @UseGuards(AuthGuard)
  @Post(':id/exports')
  async createTrackerEventDataExported(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Body() query: CreateTrackerExportsDto,
  ) {
    let flag = false;
    let advanceDataFromResponse: boolean = true;
    let creditAmmount: number = 0;
    try {
      const [{ point, advancePoint }, membershipStatus] = await Promise.all([
        this.sharedService.getPointForRequest(
          PointColumn.pendingRequests,
          user.accountId,
          PointColumn.advancePendingRequests,
        ),
        this.sharedService.getAccountMemberShipStatus(
          user.accountId,
        ),
      ]);
      const tracker = await this.trackerService.createTrackerEventDataExported(id, user, query, point, advancePoint);
      await this.sharedService.deductPointForRequest(
        advanceDataFromResponse ? PointColumn.advancePendingRequests : PointColumn.pendingRequests,
        user.accountId,
        advanceDataFromResponse ? tracker.tokenDedcution : point - 1,
        // (advanceDataFromResponse ? PointColumn.advancePendingRequests : null),
        // (advanceDataFromResponse ? advancePoint - 1 : 0),
      );
      flag = true;
      creditAmmount = tracker.tokenDedcution;
      console.log('tracker.tokenDedcution', tracker.tokenDedcution);

      return { data: tracker.data };
    } catch (error) {
      if (flag)
        this.sharedService.creditPointForRequest(
          advanceDataFromResponse ? PointColumn.advancePendingRequests : PointColumn.pendingRequests,
          user.accountId,
          creditAmmount
        );
      return { error: error };
    }
  }
  @UseGuards(AuthGuard)
  @Get(':id/exports')
  async getTrackerEventDataExported(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: LimitDto
  ) {
    try {
      const { count, trackerExports } = await this.trackerService.getTrackerEventDataExported(id, user, query);
      return { data: { count, trackerExports } };
    } catch (error) {
      return { error: error };
    }
  }
  @UseGuards(AuthGuard)
  @Delete(':id/exports/:exportId')
  async deleteTrackerEventDataExported(
    @Param('id') id: string,
    @Param('exportId') exportId: string,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const tracker = await this.trackerService.deleteTrackerEventDataExported(id, exportId, user);
      return { data: tracker };
    } catch (error) {
      return { error: error };
    }
  }
  // @UseGuards(AuthGuard)
  // @Get(':id/intelScore/:passKey/cron')
  // async getTrackerIntelScoreForCron(
  //   @Param('id') id: string,
  //   @Param('passKey') passKey: string,
  //   @GetUser() user: TCachedUser,
  //   @Query() query: GetTrackerIntelScoreDto,
  // ) {
  //   try {
  //     if (process.env.CRON_PASSKEY !== passKey) {
  //       throw new HttpException('Not Allowed', HttpStatus.FORBIDDEN);
  //     }
  //     const events = await this.trackerService.getTrackerIntelScoreForCron(
  //       user,
  //       id,
  //       query,
  //     );
  //     return { data: events };
  //   } catch (error) {
  //     return { error: error };
  //   }
  // }
  @UseGuards(AuthGuard)
  @Get(':id')
  async getTracker(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackerByIdDto,
  ) {
    try {
      const tracker = await this.trackerService.getTracker(user, id, query);
      return { data: tracker };
    } catch (error) {
      return { error: error };
    }
  }
}
