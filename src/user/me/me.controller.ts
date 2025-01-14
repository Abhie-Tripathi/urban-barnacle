import {
  Body,
  Controller,
  Get,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MeService } from './me.service';
import { TCachedUser } from 'src/shared/types';
import { File, FileInterceptor } from '@nest-lab/fastify-multer';
import { AdminGuard } from '../auth/guard';
import { GetUser } from '../decorator';

@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}
  @UseGuards(AdminGuard)
  @Get()
  async getProfileData(@GetUser() userData: TCachedUser) {
    return await this.meService.getProfileData(userData.id);
  }
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(AdminGuard)
  @Patch()
  async updateProfileData(
    @GetUser() userData: TCachedUser,
    @UploadedFile() file: File,
    @Body() body: any,
  ) {
    return await this.meService.updateProfile(body, userData.id, file);
  }
}
