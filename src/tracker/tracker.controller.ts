import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TrackerService } from './tracker.service';
import {
  CreateTrackerDto,
  GetTrackerByIdDto,
  GetTrackerEventsCountDto,
  GetTrackerEventsDto,
  UpdateTrackerDto,
} from './dto';
import { GetUser } from 'src/user/decorator';
import { TCachedUser } from 'src/utils/types';

@Controller('trackers')
export class TrackerController {
  constructor(private readonly trackerService: TrackerService) {}

  @Post()
  async createTracker(
    @Body() data: CreateTrackerDto,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const tracker = await this.trackerService.createTracker(user, data);
      return { data: tracker };
    } catch (error) {
      return { error: error.message };
    }
  }

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

  @Delete(':id')
  async deleteTracker(@Param('id') id: string, @GetUser() user: TCachedUser) {
    try {
      const tracker = await this.trackerService.deleteTracker(user, id);
      return { data: tracker };
    } catch (error) {
      return { error: error.message };
    }
  }

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

  @Get(':id/saved-events')
  async getTrackerSavedEvents(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackerEventsDto,
  ) {
    return this.trackerService.getTrackerSavedEvents(user, id, query);
  }

  @Get(':id/saved-events/count')
  async getTrackerSavedEventsCount(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackerEventsCountDto,
  ) {
    return this.trackerService.getTrackerSavedEventsCount(user, id, query);
  }

  @Get(':id')
  async getTracker(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackerByIdDto,
  ) {
    return this.trackerService.getTracker(user, id, query);
  }
}
