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
import { membershipLimit, TCachedUser } from 'src/utils/types';
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
    try {
      const [{ point, subscriptionId }, membershipStatus] = await Promise.all([
        this.sharedService.getPointForRequest(
          PointColumn.pendingRequests,
          user.accountId,
        ),
        this.sharedService.getAccountMemberShipStatus(
          user.accountId,
        ),
      ]);
      // if (point <= 0) {
      //   throw new HttpException(
      //     'You have reached the maximum limit to view data. Please get in touch with us.',
      //     HttpStatus.TOO_MANY_REQUESTS,
      //   );
      // }
      if (query.limit && membershipLimit[membershipStatus.membership].perSearchLimit < query.limit) {
        query.limit = membershipLimit[membershipStatus.membership].perSearchLimit;
      }
      if (
        membershipLimit[membershipStatus.membership].upperLimit -
        ((query.limit || 10) + (query.offset || 0)) <
        0
      ) {
        throw new HttpException(
          'You have reached the maximum limit to view data. Please get in touch with us.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      const showValues = 'basic,advance,insights,audience';
      const events = await this.trackerService.getTrackerEvents(
        user,
        id,
        query,
        showValues,
      );
      await this.sharedService.deductPointForRequest(
        PointColumn.pendingRequests,
        user.accountId,
        point - 1,
      );
      flag = true;
      return { data: events };
    } catch (error) {
      if (flag)
        this.sharedService.creditPointForRequest(
          PointColumn.pendingRequests,
          user.accountId,
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
    try {
      const [membershipStatus] = await Promise.all([
        // this.sharedService.getPointForRequest(
        //   PointColumn.pendingRequests,
        //   user.currentSubscriptionId,
        // ),
        this.sharedService.getAccountMemberShipStatus(
          user.accountId,
        ),
      ]);
      // if (point <= 0) {
      //   throw new HttpException(
      //     'You have reached the maximum limit to view data. Please get in touch with us.',
      //     HttpStatus.TOO_MANY_REQUESTS,
      //   );
      // }
      if (query.limit && membershipLimit[membershipStatus.membership].perSearchLimit < query.limit) {
        query.limit = membershipLimit[membershipStatus.membership].perSearchLimit;
      }
      if (
        membershipLimit[membershipStatus.membership].upperLimit -
        ((query.limit || 10) + (query.offset || 0)) <
        0
      ) {
        throw new HttpException(
          'You have reached the maximum limit to view data. Please get in touch with us.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      const showValues = 'basic,advance,insights,audience';
      const events = await this.trackerService.getTrackerSimilarEvents(
        user,
        id,
        query,
        showValues,
      );
      return { data: events };
    } catch (error) {
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
      const showValues = 'basic,advance,insights,audience';
      const events = await this.trackerService.getTrackerSavedEvents(
        user,
        id,
        query,
        showValues,
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
    try {
      const tracker = await this.trackerService.createTrackerEventDataExported(id, user, query);
      return { data: tracker.data };
    } catch (error) {
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
  } @UseGuards(AuthGuard)
  @Get(':id/intelScore/:passKey/cron')
  async getTrackerIntelScoreForCron(
    @Param('id') id: string,
    @Param('passKey') passKey: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackerIntelScoreDto,
  ) {
    try {
      if (process.env.CRON_PASSKEY !== passKey) {
        throw new HttpException('Not Allowed', HttpStatus.FORBIDDEN);
      }
      const events = await this.trackerService.getTrackerIntelScoreForCron(
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
