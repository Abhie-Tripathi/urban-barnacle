import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { File, FileInterceptor } from '@nest-lab/fastify-multer';
import { CreateWidgetKitDto, UpdateWidgetKitDto } from './dto';
import { KitService } from './kit.service';
import { AuthGuard } from 'src/user/auth/guard';
import { GetUser } from 'src/user/decorator';
import { SelectedUserDetails } from 'src/utils/types';

@Controller('kit')
export class KitController {
  constructor(private readonly service: KitService) {}
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post()
  createWidgetKit(
    @Body() body: CreateWidgetKitDto,
    @GetUser() user: SelectedUserDetails,
    @UploadedFile() file: File,
  ) {
    try {
      this.service.createWidgetKit(body, user, file);
      return { message: 'request processing, finding logo and other things' };
    } catch (error) {
      return { error };
    }
  }
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Patch()
  updateWidgetKit(
    @Body() body: UpdateWidgetKitDto,
    @UploadedFile() file: File,
    @GetUser() user: SelectedUserDetails,
  ) {
    return this.service.updateWidgetKit(body, file, user);
  }
  @UseGuards(AuthGuard)
  @Get()
  getWidgetKit(@GetUser() user: SelectedUserDetails) {
    try {
      return this.service.getKit(user);
    } catch (error) {
      return { error };
    }
  }
}
