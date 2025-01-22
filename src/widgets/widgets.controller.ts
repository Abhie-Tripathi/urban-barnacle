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
import { AuthGuard } from 'src/user/auth/guard';
import { GetUser } from 'src/user/decorator';
import { SelectedUserDetails } from 'src/utils/types';

@Controller('widget')
export class WidgetsController {
  constructor(private readonly service: WidgetsService) {}
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post()
  create(
    @Body() body: CreateDto,
    @GetUser() user: SelectedUserDetails,
    @UploadedFile() file: File,
  ) {
    try {
      const result = this.service.create(body, user, file);
      return result;
    } catch (error) {
      return {
        error,
      };
    }
  }
  @UseGuards(AuthGuard)
  @Get()
  getDraft(@Query() query: Query_Dto, @GetUser() user: SelectedUserDetails) {
    try {
      const result = this.service.getDraft(query, user);
      return result;
    } catch (error) {
      return {
        error,
      };
    }
  }
  @UseGuards(AuthGuard)
  @Get(':id')
  getWidgetByid(
    @Param('id') patram,
    @Query() query,
    @GetUser('accountId') user: string,
  ) {
    try {
      const result = this.service.getWidgetById(patram, query, user);
      return result;
    } catch (error) {
      return {
        error,
      };
    }
  }
}
