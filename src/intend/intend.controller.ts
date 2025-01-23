import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IntendService } from './intend.service';
import { CreateIntendDto } from './dto/create.dto';
import { Update_Dto } from './dto/update.dto';
import { QueryIntend_Dto } from './dto/search.dto';
import { AuthGuard } from 'src/user/auth/guard';
import { SelectedUserDetails } from 'src/utils/types';
import { GetUser } from 'src/user/decorator';

@Controller('intend')
export class IntendController {
  constructor(private readonly service: IntendService) {}
  @Post()
  createIntend(@Body() Body: CreateIntendDto) {
    try {
      const result = this.service.createIntend(Body);
      return result;
    } catch (error) {
      console.log(error);
      return error;
    }
  }
  @Patch()
  async updateIntend(@Body() body: Update_Dto) {
    try {
      const result = await this.service.updateIntend(body);
      return result;
    } catch (error) {
      return error;
    }
  }
  @UseGuards(AuthGuard)
  @Get('users')
  async getUsers(
    @Query() query: QueryIntend_Dto,
    @GetUser() user: SelectedUserDetails,
  ) {
    try {
      const result = this.service.getIntend(query, user);
      return result;
    } catch (error) {
      return error;
    }
  }
}
