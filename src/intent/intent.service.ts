import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { IntentDataService } from './intent.data.service';
import { TCachedUser } from 'src/utils/types';
import {
  CreateIntentDto,
  CreateIntentHttpDto,
  CreateUserEventInterestDto,
  CreateUserEventInterestHttpDto,
  UpdateUserEventInterestDto,
} from './dto';
import { CreateEnquiryActivityHttpDto } from './dto/enquiryActivity.dto';

@Injectable()
export class IntentService {
  constructor(private readonly intentDataService: IntentDataService) {}

  async createUserEventInterest(
    user: TCachedUser,
    data: CreateUserEventInterestHttpDto,
  ) {
    const userEventInterest =
      await this.intentDataService.createUserEventInterest({
        ...data,
        accountId: user.accountId,
        interestedUserId: user.id,
      });
    return userEventInterest;
  }

  async updateUserEventInterest(data: UpdateUserEventInterestDto) {
    return this.intentDataService.updateUserEventInterest(data);
  }

  async deleteUserEventInterest(user: TCachedUser, id: string) {
    return this.intentDataService.updateUserEventInterest({
      id,
      modifiedBy: user.id,
      deleted: true,
    });
  }

  async createUpvote(user: TCachedUser, data: CreateIntentHttpDto) {
    return this.intentDataService.createIntent({
      ...data,
      userId: user.id,
      accountId: user.accountId,
    });
  }

  async deleteUpvote(user: TCachedUser, id: string) {
    const intent = await this.intentDataService.getIntents({
      id,
      userId: user.id,
      accountId: user.accountId,
    });
    if (intent.length === 0) {
      throw new HttpException('Upvote not found', HttpStatus.NOT_FOUND);
    }
    await this.intentDataService.updateIntent({
      id,
      deleted: true,
    });
    return { message: 'Upvote deleted successfully' };
  }

  async createEnquiryActivity(
    user: TCachedUser,
    data: CreateEnquiryActivityHttpDto,
  ) {
    return this.intentDataService.createEnquiryActivity({
      ...data,
      userId: user.id,
      accountId: user.accountId,
    });
  }

  async deleteEnquiryActivity(user: TCachedUser, id: string) {
    const enquiryActivity = await this.intentDataService.getEnquiryActivities({
      id,
      userId: user.id,
      accountId: user.accountId,
    });
    if (enquiryActivity.length === 0) {
      throw new HttpException(
        'Enquiry activity not found',
        HttpStatus.NOT_FOUND,
      );
    }
    await this.intentDataService.updateEnquiryActivity({
      id,
      deleted: true,
    });
    return { message: 'Enquiry activity deleted successfully' };
  }
}
