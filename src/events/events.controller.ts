import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CountQueryDto, QueryDto } from './dto';
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
      const events = await this.eventsService.getAllEvents(userId, query);
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
