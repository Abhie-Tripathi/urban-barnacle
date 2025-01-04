import {
  Body,
  Controller,
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
import { EventService } from './event.service';
import {
  CreateEventDto,
  EventIdParamDto,
  EventSpeakerDto,
  Query_Dto,
  SubEvent_DTO,
  UpdateEventDto,
} from './dto';
import { File, FileInterceptor } from '@nest-lab/fastify-multer';
import { TCachedUser } from 'src/shared/types';
import { AuthGuard } from 'src/guard';
import { GetUser } from 'src/decorator';

@Controller('event')
export class EventController {
  constructor(private eventService: EventService) {}


  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post()
  createEvent(
    @Body() body: CreateEventDto,
    @GetUser() user: TCachedUser,
    @UploadedFile() file: File,
  ) {
    return this.eventService.createEvent(body, file, user);
  }
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post('speaker')
  createEventSpeaker(
    @Body() body: EventSpeakerDto,
    @GetUser() user: TCachedUser,
    @UploadedFile() file: File,
  ) {
    return this.eventService.createEventSpeaker(body, file, user);
  }
  @UseGuards(AuthGuard)
  @Get('suggestion')
  getEventSuggestion(@Query() type: Query_Dto, @GetUser() user: TCachedUser) {
    return this.eventService.getEventSuggestion(type, user);
  }
  @UseGuards(AuthGuard)
  @Get()
  findAll(@Query() type: Query_Dto, @GetUser() user: TCachedUser) {
    return this.eventService.getEvent(user, type);
  }
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Patch()
  updateEvent(
    @Body() body: UpdateEventDto,
    @GetUser() user: TCachedUser,
    @UploadedFile() file: File,
  ) {
    return this.eventService.updateEvent(body, file, user);
  }
  @UseGuards(AuthGuard)
  @Get(':id')
  async getEvent(@Param() dto: EventIdParamDto, @Query() query) {
    const event = await this.eventService.getEventById(dto.id, query);
    return event;
  }
}
