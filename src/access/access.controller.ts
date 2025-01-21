import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateAccessHttpDto, UpdateAccessHttpDto } from './dto';
import { AccessService } from './access.service';
import { TCachedUser } from 'src/utils/types';
import { GetUser } from 'src/user/decorator';

@Controller('access')
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Post()
  async createAccess(
    @Body() data: CreateAccessHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const access = await this.accessService.createAccess(user, data);
      return { data: access };
    } catch (error) {
      return { error: new HttpException(error.message, error.status) };
    }
  }

  @Patch(':id')
  async updateAccess(
    @Param('id') id: string,
    @Body() data: UpdateAccessHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const access = await this.accessService.updateAccess(user, id, data);
      return { data: access };
    } catch (error) {
      return { error: new HttpException(error.message, error.status) };
    }
  }

  @Delete(':id')
  async deleteAccess(@Param('id') id: string, @GetUser() user: TCachedUser) {
    try {
      const access = await this.accessService.deleteAccess(user, id);
      return { data: access };
    } catch (error) {
      return { error: new HttpException(error.message, error.status) };
    }
  }
}
