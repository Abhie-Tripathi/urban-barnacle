import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PromotedEventsService } from './promoted-event.service';
import {
  CreateEventDto,
  EventDuplicate_DTO,
  EventIdParamDto,
  EventSpeakerDto,
  Query_Dto,
  SubEvent_DTO,
  UpdateEventDto,
} from './dto';
import { File, FileInterceptor } from '@nest-lab/fastify-multer';
import { SelectedUserDetails, TCachedUser } from 'src/utils/types';
import { AuthGuard } from '../user/auth/guard';
import { GetUser } from '../user/decorator';

@Controller('promot-event')
export class PromotedEventsController {
  constructor(private eventService: PromotedEventsService) { }
  @UseGuards(AuthGuard)
  @Post('find-duplicates')
  async checkDuplicateEvents(@Body() body: EventDuplicate_DTO, @GetUser() user: TCachedUser) {
    try {
      return await this.eventService.checkDuplicateEvents(body, user)
    } catch (error) {
      return { error };
    }
  }
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post()
  async createEvent(
    @Body() body: CreateEventDto,
    @GetUser() user: TCachedUser,
    @UploadedFile() file: File,
  ) {
    try {
      const result = await this.eventService.createEvent(body, file, user);
      return result;
    } catch (error) {
      return error;
    }
  }
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post('speaker')
  async createEventSpeaker(
    @Body() body: EventSpeakerDto,
    @GetUser() user: SelectedUserDetails,
    @UploadedFile() file: File,
  ) {
    try {
      const result = await this.eventService.createEventSpeaker(
        body,
        file,
        user,
      );
      return result;
    } catch (error) {
      return error;
    }
  }
  // @UseGuards(AuthGuard)
  // @Get('suggestion')
  // getEventSuggestion(@Query() type: Query_Dto, @GetUser() user: SelectedUserDetails) {
  //   return this.eventService.getEventSuggestion(type, user);
  // }
  @UseGuards(AuthGuard)
  @Get()
  async findAll(
    @Query() type: Query_Dto,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const result = await this.eventService.getEvent(user, type);
      return result;
    } catch (error) {
      return error;
    }
  }
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Patch()
  async updateEvent(
    @Body() body: UpdateEventDto,
    @GetUser() user: SelectedUserDetails,
    @UploadedFile() file: File,
  ) {
    try {
      const result = await this.eventService.updateEvent(body, file, user);
      return result;
    } catch (error) {
      return error;
    }
  }
  @UseGuards(AuthGuard)
  @Get(':id')
  async getEvent(@Param() dto: EventIdParamDto, @Query() query) {
    try {
      const event = await this.eventService.getGeniEventById(dto.id);
      return event;
    } catch (error) {
      return error;
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async deletePromotedEvent(
    @Param('id') eventId,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const event = await this.eventService.deletePromotedEvent(eventId, user);
      return event;
    } catch (error) {
      return error;
    }
  }
}
