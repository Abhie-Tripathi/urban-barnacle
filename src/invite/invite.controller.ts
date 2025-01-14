import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { InviteService } from './invite.service';
import { TCachedUser } from 'src/shared/types';
import { BodyInviteDto, QueryInvite_Dto } from './dto';
import { AuthGuard } from 'src/user/auth/guard';
import { GetUser } from 'src/user/decorator';

@Controller('invite')
export class InviteController {
  constructor(private readonly service: InviteService) { }
  @UseGuards(AuthGuard)
  @Get()
  async getInvite(@Query() query: QueryInvite_Dto, @GetUser() user: TCachedUser) {
    return await this.service.getInvite(query,user);
  }
  @UseGuards(AuthGuard)
  @Post('send')
  async sendInvite(@Body() query: BodyInviteDto, @GetUser() user: TCachedUser) {
    this.service.sendInvite(query, user);
    return { data: { message: 'invite send.' } };
  }
}
