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
import {
  Enquiry,
  IntentType,
  Interest,
  UserEventInterest,
} from '@prisma/client';
import { EventsService } from 'src/events/events.service';
import { PromotedEventsDataService } from 'src/promotedEvent/promoted-even.data.service';

@Injectable()
export class IntentService {
  constructor(
    private readonly intentDataService: IntentDataService,
    private readonly enquiryService: EnquiryService,
    private readonly eventService: EventsService,
    private readonly promoteEventDataService: PromotedEventsDataService
  ) { }

  async createUserEventInterest(
    user: TCachedUser,
    data: CreateUserEventInterestDto,
  ) {
    let enquiry: Enquiry | null = null;
    if (
      // data.sourceModule !== 'PROMOTED_EVENT' &&
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
        const event = await Promise.all([this.eventService.getEvent(
          data.eventId,
          'suggestion',
          undefined,
          false
        ), this.promoteEventDataService.getEventForGeni(data.eventId)]);
        if (!event[0].basic['id'] && !event[1].data) {
          throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
        }
        enquiry = await this.enquiryService.createEnquiry(user, {
          accountId: user.accountId,
          eventId: data.eventId,
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
    if (
      // data.sourceModule !== 'PROMOTED_EVENT' &&
      enquiry) {
      userEventInterestParams['enquiryId'] = enquiry.id;
    }
    if (data.recommendedBy) {
      userEventInterestParams['recommendedBy'] = data.recommendedBy;
    }
    if (data.sourceId) {
      userEventInterestParams['sourceId'] = data.sourceId;
    }
    if (
      data.interest !== 'BOOKMARK'
      // &&
      // data.sourceModule !== 'PROMOTED_EVENT'
    ) {
      const previousInterest =
        await this.intentDataService.getUserEventInterest({
          eventId: data.eventId,
          accountId: user.accountId,
          interestedUserId: data.interestedUserId,
          interest: [data.interest],
        });
      if (previousInterest.length > 0) {
        throw new HttpException(
          'Interest already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const userEventInterest =
      await this.intentDataService.createUserEventInterest(
        userEventInterestParams,
      );
    return { data: userEventInterest };
  }

  async updateUserEventInterest(
    user: TCachedUser,
    id: string,
    data: UpdateUserEventInterestDto,
  ) {
    const interests = (await this.intentDataService.getUserEventInterest({
      id: id,
      accountId: user.accountId,
      show: 'enquiry',
    })) as (UserEventInterest & { enquiry: Enquiry })[];
    if (!interests || (interests && interests.length === 0)) {
      throw new HttpException('Interest not found', HttpStatus.NOT_FOUND);
    }
    const interest = interests[0];
    if (interest.enquiry.ownerId !== user.id) {
      throw new HttpException(
        'You are not allowed to update this interest',
        HttpStatus.FORBIDDEN,
      );
    }
    if (interest.status !== 'PENDING' && data.status === 'PENDING') {
      throw new HttpException(
        'You can not update the status back to pending',
        HttpStatus.BAD_REQUEST,
      );
    }
    return {
      data: {
        ...(await this.intentDataService.updateUserEventInterest({
          ...data,
          id,
          modifiedBy: user.id,
          approvedBy: user.id,
        })),
      },
    };
  }

  async deleteUserEventInterest(user: TCachedUser, id: string) {
    const interests = (await this.intentDataService.getUserEventInterest({
      id: id,
      accountId: user.accountId,
      show: 'enquiry',
    })) as (UserEventInterest & { enquiry: Enquiry })[];
    if (!interests || (interests && interests.length === 0)) {
      throw new HttpException('Interest not found', HttpStatus.NOT_FOUND);
    }
    const interest = interests[0];
    console.log({ interest });
    if (
      interest.enquiry?.ownerId &&
      interest.enquiry.ownerId !== user.id &&
      interest.interest !== 'BOOKMARK'
    ) {
      throw new HttpException(
        'You are not allowed to update this interest',
        HttpStatus.FORBIDDEN,
      );
    }
    if (interest.interest !== Interest.BOOKMARK) {
      throw new HttpException(
        'You are not allowed to delete this interest',
        HttpStatus.FORBIDDEN,
      );
    }
    return {
      data: {
        ...(await this.intentDataService.updateUserEventInterest({
          id,
          modifiedBy: user.id,
          deleted: true,
        })),
      },
    };
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

  async deleteUpvote(user: TCachedUser, data: GetIntentDto) {
    const intent = await this.intentDataService.getIntents({
      ...data,
      userId: user.id,
      accountId: user.accountId,
    });
    if (intent.length === 0) {
      throw new HttpException('Upvote not found', HttpStatus.NOT_FOUND);
    }
    await this.intentDataService.updateIntent({
      id: intent[0].id,
      deleted: true,
    });
    return { data: { message: 'Upvote deleted successfully' } };
  }

  async createEnquiryActivity(
    user: TCachedUser,
    data: CreateEnquiryActivityHttpDto,
  ) {
    return {
      data: {
        ...(await this.intentDataService.createEnquiryActivity({
          ...data,
          userId: user.id,
          accountId: user.accountId,
        })),
      },
    };
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
    return { data: { message: 'Enquiry activity deleted successfully' } };
  }
}
