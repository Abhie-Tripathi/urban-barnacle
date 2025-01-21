import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { IntentService } from './intent.service';
import {
  CreateIntentHttpDto,
  CreateUserEventInterestHttpDto,
  UpdateUserEventInterestHttpDto,
} from './dto';
import { GetUser } from 'src/user/decorator';
import { TCachedUser } from 'src/utils/types';
import { CreateEnquiryActivityHttpDto } from './dto/enquiryActivity.dto';

@Controller('intent')
export class IntentController {
  constructor(private readonly intentService: IntentService) {}

  @Post('user-event-interest')
  async createUserEventInterest(
    @Body() data: CreateUserEventInterestHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    return this.intentService.createUserEventInterest(user, data);
  }

  @Patch('user-event-interest/:id')
  async updateUserEventInterest(
    @Param('id') id: string,
    @Body() data: UpdateUserEventInterestHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    return this.intentService.updateUserEventInterest({
      ...data,
      id,
      approvedBy: user.id,
      modifiedBy: user.id,
    });
  }

  @Delete('user-event-interest/:id')
  async deleteUserEventInterest(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
  ) {
    return this.intentService.deleteUserEventInterest(user, id);
  }

  @Post('upvote')
  async createUpvote(
    @Body() data: CreateIntentHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    return this.intentService.createUpvote(user, data);
  }

  @Delete('upvote/:id')
  async deleteUpvote(@Param('id') id: string, @GetUser() user: TCachedUser) {
    return this.intentService.deleteUpvote(user, id);
  }

  @Post('enquiry-activity')
  async createEnquiryActivity(
    @Body() data: CreateEnquiryActivityHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    return this.intentService.createEnquiryActivity(user, data);
  }

  @Delete('enquiry-activity/:id')
  async deleteEnquiryActivity(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
  ) {
    return this.intentService.deleteEnquiryActivity(user, id);
  }
}
