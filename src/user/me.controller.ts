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
import { AdminGuard } from 'src/guard';
import { TCachedUser } from 'src/shared/types';
import { GetUser } from 'src/decorator';
import { File, FileInterceptor } from '@nest-lab/fastify-multer';
import { UpdateProfileDto } from './dto';

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
    @Body() body: UpdateProfileDto,
  ) {
    return await this.meService.updateProfile(body, userData.id, file);
  }
}
