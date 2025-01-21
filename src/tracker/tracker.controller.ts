import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TrackerService } from './tracker.service';
import {
  CreateTrackerDto,
  GetTrackerByIdDto,
  GetTrackerEventsCountDto,
  GetTrackerEventsDto,
  GetTrackerUsersDto,
  UpdateTrackerDto,
} from './dto';
import { GetUser } from 'src/user/decorator';
import { TCachedUser } from 'src/utils/types';
import { AuthGuard } from 'src/user/auth/guard';

@Controller('trackers')
export class TrackerController {
  constructor(private readonly trackerService: TrackerService) {}

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
  @Patch(':id')
  async updateTracker(
    @Param('id') id: string,
    @Body() data: UpdateTrackerDto,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const tracker = await this.trackerService.updateTracker(user, id, data);
      return { data: tracker };
    } catch (error) {
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async deleteTracker(@Param('id') id: string, @GetUser() user: TCachedUser) {
    try {
      const tracker = await this.trackerService.deleteTracker(user, id);
      return { data: tracker };
    } catch (error) {
      return { error: error.message };
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
      const events = await this.trackerService.getTrackerEvents(
        user,
        id,
        query,
      );
      return { data: events };
    } catch (error) {
      return { error: error.message };
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
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/saved-events')
  async getTrackerSavedEvents(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackerEventsDto,
  ) {
    return this.trackerService.getTrackerSavedEvents(user, id, query);
  }

  @UseGuards(AuthGuard)
  @Get(':id/saved-events/count')
  async getTrackerSavedEventsCount(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackerEventsCountDto,
  ) {
    return this.trackerService.getTrackerSavedEventsCount(user, id, query);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  async getTracker(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackerByIdDto,
  ) {
    return this.trackerService.getTracker(user, id, query);
  }

  @UseGuards(AuthGuard)
  @Get(':id/users')
  async getTrackerUsers(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackerUsersDto,
  ) {
    return this.trackerService.getTrackerUsers(user, id, query);
  }
}
