import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { InviteService } from './invite.service';
import { BodyInviteDto, QueryInvite_Dto } from './dto';
import { AuthGuard } from 'src/user/auth/guard';
import { GetUser } from 'src/user/decorator';
import { SelectedUserDetails } from 'src/utils/types';

@Controller('invite')
export class InviteController {
  constructor(private readonly service: InviteService) {}
  @UseGuards(AuthGuard)
  @Get()
  async getInvite(
    @Query() query: QueryInvite_Dto,
    @GetUser() user: SelectedUserDetails,
  ) {
    try {
      const result = await this.service.getInvite(query, user);
      return result;
    } catch (error) {
      return {
        error,
      };
    }
  }
  @UseGuards(AuthGuard)
  @Post()
  async sendInvite(
    @Body() query: BodyInviteDto,
    @GetUser() user: SelectedUserDetails,
  ) {
    try {
      this.service.sendInvite(query, user);
      const result = { data: { message: 'invite send.' } };
      return result;
    } catch (error) {
      return {
        error,
      };
    }
  }
}
