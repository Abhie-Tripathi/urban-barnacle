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
  UseGuards,
} from '@nestjs/common';
import { CreateAccessHttpDto, UpdateAccessHttpDto } from './dto';
import { AccessService } from './access.service';
import { TCachedUser } from 'src/utils/types';
import { GetUser } from 'src/user/decorator';
import { AuthGuard } from 'src/user/auth/guard';

@Controller('access')
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  // @UseGuards(AuthGuard)
  // @Patch(':id')
  // async updateAccess(
  //   @Param('id') id: string,
  //   @Body() data: UpdateAccessHttpDto,
  //   @GetUser() user: TCachedUser,
  // ) {
  //   try {
  //     const access = await this.accessService.updateAccess(user, id, data);
  //     return { data: access };
  //   } catch (error) {
  //     return { error: new HttpException(error.message, error.status) };
  //   }
  // }

  // @UseGuards(AuthGuard)
  // @Delete(':id')
  // async deleteAccess(@Param('id') id: string, @GetUser() user: TCachedUser) {
  //   try {
  //     const access = await this.accessService.deleteAccess(user, id);
  //     return { data: access };
  //   } catch (error) {
  //     return { error: new HttpException(error.message, error.status) };
  //   }
  // }
}
