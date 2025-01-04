import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UseGuards,
  UploadedFile,
} from '@nestjs/common';
import { CreateDto, Query_Dto, UpdateWidgetKitDto, URL_Dto } from './dto';
import { File, FileInterceptor } from '@nest-lab/fastify-multer';
import { WidgetsService } from './widgets.service';
import { TCachedUser } from 'src/shared/types';
import { AuthGuard } from 'src/guard';
import { GetUser } from 'src/decorator';

@Controller('widget')
export class WidgetsController {
  constructor(private readonly service: WidgetsService) {}
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post()
  create(
    @Body() body: CreateDto,
    @GetUser() user: TCachedUser,
    @UploadedFile() file: File,
  ) {
    return this.service.create(body, user, file);
  }
  @UseGuards(AuthGuard)
  @Get()
  getDraft(@Query() query: Query_Dto, @GetUser() user: TCachedUser) {
    return this.service.getDraft(query, user);
  }
  @UseGuards(AuthGuard)
  @Get(':id')
  getWidgetByid(
    @Param('id') patram,
    @Query() query,
    @GetUser('companyId') user: string,
  ) {
    return this.service.getWidgetById(patram, query, user);
  }
}
