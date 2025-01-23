import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IntentService } from './intent.service';
import {
  CreateIntentHttpDto,
  CreateUserEventInterestHttpDto,
  UpdateUserEventInterestHttpDto,
} from './dto';
import { GetUser } from 'src/user/decorator';
import { TCachedUser } from 'src/utils/types';
import { CreateEnquiryActivityHttpDto } from './dto/enquiryActivity.dto';
import { AuthGuard } from 'src/user/auth/guard';

@Controller('intents')
export class IntentController {
  constructor(private readonly intentService: IntentService) {}

  @UseGuards(AuthGuard)
  @Post('user-event-interest')
  async createUserEventInterest(
    @Body() data: CreateUserEventInterestHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    console.log({ data });
    const userEventInterest = await this.intentService.createUserEventInterest(
      user,
      {
        ...data,
        accountId: user.accountId,
        interestedUserId: user.id,
      },
    );
    return userEventInterest;
  }

  @UseGuards(AuthGuard)
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

  @UseGuards(AuthGuard)
  @Delete('user-event-interest/:id')
  async deleteUserEventInterest(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
  ) {
    return this.intentService.deleteUserEventInterest(user, id);
  }

  @UseGuards(AuthGuard)
  @Post('upvote')
  async createUpvote(
    @Body() data: CreateIntentHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const upvote = await this.intentService.createUpvote(user, 'UPVOTE', {
        ...data,
      });
      return {
        data: upvote,
      };
    } catch (error) {
      return {
        error: error,
      };
    }
  }

  @UseGuards(AuthGuard)
  @Delete('upvote/:id')
  async deleteUpvote(@Param('id') id: string, @GetUser() user: TCachedUser) {
    return this.intentService.deleteUpvote(user, id);
  }

  @UseGuards(AuthGuard)
  @Post('enquiry-activity')
  async createEnquiryActivity(
    @Body() data: CreateEnquiryActivityHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    return this.intentService.createEnquiryActivity(user, data);
  }

  @UseGuards(AuthGuard)
  @Delete('enquiry-activity/:id')
  async deleteEnquiryActivity(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
  ) {
    return this.intentService.deleteEnquiryActivity(user, id);
  }
}
