import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
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
  GetTrackerUsersDto,
  UpdateTrackerDto,
  UpdateTrackerHttpDto,
} from './dto';
import { GetUser } from 'src/user/decorator';
import { TCachedUser } from 'src/utils/types';
import { AuthGuard } from 'src/user/auth/guard';
import { GetCommentsDto } from 'src/comment/dto';
import { CreateAccessHttpDto, UpdateAccessHttpDto } from 'src/access/dto';

@Controller('trackers')
export class TrackerController {
  constructor(private readonly trackerService: TrackerService) { }

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
    try {
      const showValues = 'basic,advance,insights,audience';
      const events = await this.trackerService.getTrackerEvents(
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
  async getTrackerEventDataExported(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Body() query: CreateTrackerExportsDto,
  ) {
    try {
      const tracker = await this.trackerService.getTrackerEventDataExported(id, user, query);
      return { data: tracker };
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
