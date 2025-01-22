import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { IntentDataService } from './intent.data.service';
import { TCachedUser } from 'src/utils/types';
import {
  CreateIntentDto,
  CreateIntentHttpDto,
  CreateUserEventInterestDto,
  CreateUserEventInterestHttpDto,
  GetIntentDto,
  UpdateUserEventInterestDto,
} from './dto';
import { CreateEnquiryActivityHttpDto } from './dto/enquiryActivity.dto';
import { EnquiryDataService } from 'src/enquiry/enquiry.data.service';
import { EnquiryService } from 'src/enquiry/enquiry.service';
import { Enquiry, IntentType } from '@prisma/client';
import { EventsService } from 'src/events/events.service';

@Injectable()
export class IntentService {
  constructor(
    private readonly intentDataService: IntentDataService,
    private readonly enquiryService: EnquiryService,
    private readonly eventService: EventsService,
  ) {}

  async createUserEventInterest(
    user: TCachedUser,
    data: CreateUserEventInterestDto,
  ) {
    let enquiry: Enquiry | null = null;
    if (
      data.sourceModule !== 'PROMOTED_EVENT' &&
      data.interest !== 'BOOKMARK'
    ) {
      const enquiryParams = {};
      if (data.enquiryId) {
        enquiryParams['ids'] = [data.enquiryId];
      } else if (data.eventId) {
        enquiryParams['eventId'] = data.eventId;
      } else {
        throw new HttpException(
          'Enquiry or eventId is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      const enquiries = await this.enquiryService.getEnquiries({
        ...enquiryParams,
        accountId: user.accountId,
        limit: 1,
        offset: 0,
      });
      if (data.enquiryId && enquiries.length === 0) {
        throw new HttpException('Enquiry not found', HttpStatus.NOT_FOUND);
      } else {
        enquiry = enquiries[0];
      }
      if (!data.enquiryId && data.eventId && enquiries.length === 0) {
        const event = await this.eventService.getEvent(user.id, data.eventId);
        if (!event) {
          throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
        }
        enquiry = await this.enquiryService.createEnquiry(user, {
          accountId: user.accountId,
          eventId: data.eventId,
          eventData: {
            name: event.name,
            name_lower: event.name.toLowerCase(),
            eventId: event.id,
            startDate: event.startDateTime,
            endDate: event.endDateTime,
          },
          initiatedBy: data.recommendedBy || data.interestedUserId,
        });
      }
    }

    const userEventInterestParams = {
      sourceModule: data.sourceModule,
      interest: data.interest,
      accountId: user.accountId,
      eventId: enquiry ? enquiry.eventId : data.eventId,
      interestedUserId: data.interestedUserId,
    };
    if (data.sourceModule !== 'PROMOTED_EVENT' && enquiry) {
      userEventInterestParams['enquiryId'] = enquiry.id;
    }
    if (data.recommendedBy) {
      userEventInterestParams['recommendedBy'] = data.recommendedBy;
    }
    if (data.sourceId) {
      userEventInterestParams['sourceId'] = data.sourceId;
    }
    const userEventInterest =
      await this.intentDataService.createUserEventInterest(
        userEventInterestParams,
      );
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

  async createUpvote(
    user: TCachedUser,
    intentType: IntentType,
    data: CreateIntentHttpDto,
  ) {
    return this.intentDataService.createIntent({
      ...data,
      intentType,
      userId: user.id,
      accountId: user.accountId,
    });
  }

  async checkUserUpvote(data: GetIntentDto) {
    if (
      !data.targetId ||
      !data.targetModule ||
      !data.accountId ||
      !data.userId
    ) {
      throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
    }
    const upvote = await this.intentDataService.getIntents({
      accountId: data.accountId,
      userId: data.userId,
      targetId: data.targetId,
      targetModule: data.targetModule,
      intentType: IntentType.UPVOTE,
    });
    if (upvote.length === 0) {
      return false;
    }
    return true;
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
