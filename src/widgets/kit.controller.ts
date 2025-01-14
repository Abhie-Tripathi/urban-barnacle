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
import { TCachedUser } from 'src/shared/types';
import { CreateWidgetKitDto, UpdateWidgetKitDto } from './dto';
import { KitService } from './kit.service';
import { AuthGuard } from 'src/user/auth/guard';
import { GetUser } from 'src/user/decorator';

@Controller('kit')
export class KitController {
  constructor(private readonly service: KitService) {}
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post()
  createWidgetKit(
    @Body() body: CreateWidgetKitDto,
    @GetUser() user: TCachedUser,
    @UploadedFile() file: File,
  ) {
    this.service.createWidgetKit(body, user, file);
    return { message: 'request processing, finding logo and other things' };
  }
  // @UseGuards(AuthGuard)
  // @UseInterceptors(FileInterceptor('file'))
  // @Patch()
  // updateWidgetKit(
  //   @Body() body: UpdateWidgetKitDto,
  //   @UploadedFile() file: File,
  //   @GetUser() user: TCachedUser,
  // ) {
  //   return this.service.updateWidgetKit(body, file, user);
  // }
  @UseGuards(AuthGuard)
  @Get()
  getWidgetKit(@GetUser() user: TCachedUser) {
    return this.service.getKit(user);
  }
}
