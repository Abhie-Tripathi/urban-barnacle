import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  EnquiryActivity,
  Interest,
  InterestStatus,
  Prisma,
} from '@prisma/client';
import { microserviceEndpoints } from 'src/utils/endpoints';
import { ConfigService } from '@nestjs/config';
import {
  CreateIntentDto,
  CreateUserEventInterestDto,
  GetIntentDto,
  GetUserEventInterestCountDto,
  GetUserEventInterestDto,
  UpdateIntentDto,
  UpdateUserEventInterestDto,
  UserInterestsGroupBy,
} from './dto/';
import {
  CreateEnquiryActivityDto,
  EnquiryActivityGroupBy,
  EnquiryActivityResponseSchema,
  GetEnquiryActivityCountDto,
  GetEnquiryActivityDto,
  UpdateEnquiryActivityDto,
} from './dto/enquiryActivity.dto';
import { EnquiryDataService } from 'src/enquiry/enquiry.data.service';
import { TCachedUser } from 'src/utils/types';

@Injectable()
export class IntentDataService {
  constructor(private readonly prisma: PrismaService) { }

  async createUserEventInterest(data: CreateUserEventInterestDto) {
    if (!data.eventId) {
      throw new HttpException('Event id is required', HttpStatus.BAD_REQUEST);
    }
    if (data.sourceModule !== 'RESEARCH' && !data.sourceId) {
      throw new HttpException('Source id is required ', HttpStatus.BAD_REQUEST);
    }
    const userEventInterest = await this.prisma.userEventInterest.create({
      data: {
        ...data,
        eventId: data.eventId,
        modifiedBy: data.recommendedBy || data.interestedUserId,
        status: InterestStatus.PENDING,
      },
    });
    return userEventInterest;
  }

  async updateUserEventInterest(data: UpdateUserEventInterestDto) {
    if (data.status && !data.approvedBy) {
      throw new HttpException(
        'Approved by is required for status update',
        HttpStatus.BAD_REQUEST,
      );
    }
    const userEventInterest = await this.prisma.userEventInterest.update({
      where: { id: data.id },
      data,
    });
    return userEventInterest;
  }

  async getUserEventInterest(data: GetUserEventInterestDto) {
    const { limit, offset, interest, show, ...rest } = data;
    if (interest && interest.length > 0) {
      rest['interest'] = { in: interest };
    }
    const include = {};
    if (show) {
      if (show === 'user') include['interestedUser'] = true;
      else if (show === 'enquiry') include['enquiry'] = true;
    }
    const userEventInterests = await this.prisma.userEventInterest.findMany({
      where: { ...rest, deleted: false },
      include,
      skip: offset,
      take: limit,
    });
    return userEventInterests;
  }

  async getAllEventInterestsByUser(user: TCachedUser, eventIds: string[], trackerId: string | undefined = undefined) {
    const trackerWhere: object = {};
    if (trackerId) {
      trackerWhere['sourceId'] = trackerId;
      trackerWhere['sourceModule'] = 'TRACKER';
    }
    const userEventInterests = await this.prisma.userEventInterest.findMany({
      where: {
        interestedUserId: user.id,
        accountId: user.accountId,
        deleted: false,
        eventId: {
          in: eventIds,
        },
        interest: {
          not: Interest.ORGANIZE,
        },
        ...trackerWhere
      },
      select: {
        id: true,
        interest: true,
        eventId: true,
      },
    });
    return userEventInterests;
  }

  async getUserEventInterestCount(data: GetUserEventInterestCountDto) {
    const { groupBy, interest, ...rest } = data;
    if (interest && interest.length > 0) {
      rest['interest'] = {
        in: interest,
      };
    }
    let count;
    if (groupBy) {
      const by: Prisma.UserEventInterestScalarFieldEnum[] = [];
      if (groupBy === UserInterestsGroupBy.interests) {
        by.push('interest');
      } else if (groupBy === UserInterestsGroupBy.status) {
        by.push('status');
      }
      count = await this.prisma.userEventInterest.groupBy({
        where: { ...rest, deleted: false },
        by: by,
        _count: {
          id: true,
        },
      });
    } else {
      count = await this.prisma.userEventInterest.count({
        where: { ...rest, deleted: false },
      });
    }

    return count;
  }

  async createEnquiryActivity(data: CreateEnquiryActivityDto) {
    if (data.activityType === 'UPVOTE' && !data.activitySubType) {
      throw new HttpException(
        'Activity sub type is required for upvote activity',
        HttpStatus.BAD_REQUEST,
      );
    }
    const previousActivity = await this.prisma.enquiryActivity.findFirst({
      where: {
        accountId: data.accountId,
        enquiryId: data.enquiryId,
        userId: data.userId,
        activityType: data.activityType,
        activitySubType: data.activitySubType || null,
      },
    });
    let enquiryActivity: EnquiryActivity;
    if (previousActivity) {
      if (previousActivity.deleted) {
        enquiryActivity = await this.prisma.enquiryActivity.update({
          where: {
            id: previousActivity.id,
          },
          data: {
            deleted: false,
          },
        });
      } else {
        throw new HttpException('Activity already exists', HttpStatus.CONFLICT);
      }
    } else {
      enquiryActivity = await this.prisma.enquiryActivity.create({
        data,
      });
    }

    const enquiryActivityResponse = EnquiryActivityResponseSchema.parse({
      id: enquiryActivity.id,
      activityType: enquiryActivity.activityType,
      activitySubType: enquiryActivity.activitySubType,
      userId: enquiryActivity.userId,
      enquiryId: enquiryActivity.enquiryId,
      createdAt: enquiryActivity.updatedAt,
    });
    return enquiryActivityResponse;
  }

  async updateEnquiryActivity(data: UpdateEnquiryActivityDto) {
    const enquiryActivity = await this.prisma.enquiryActivity.update({
      where: { id: data.id },
      data,
    });
    return enquiryActivity;
  }

  async getEnquiryActivities(data: GetEnquiryActivityDto) {
    const { show, ...rest } = data;
    const include = {};
    if (show && show === 'user') {
      include['user'] = true;
    }
    const enquiryActivities = await this.prisma.enquiryActivity.findMany({
      where: { ...rest, deleted: false },
      include,
    });
    return enquiryActivities;
  }

  async getEnquiryActivityCount(data: GetEnquiryActivityCountDto) {
    const { groupBy, ...rest } = data;
    let count;
    if (groupBy) {
      const by: Prisma.EnquiryActivityScalarFieldEnum[] = [];
      if (groupBy === EnquiryActivityGroupBy.activitySubType) {
        by.push('activitySubType');
      }
      count = await this.prisma.enquiryActivity.groupBy({
        where: { ...rest, deleted: false },
        by: by,
        _count: {
          id: true,
        },
      });
    } else {
      count = await this.prisma.enquiryActivity.count({
        where: { ...rest, deleted: false },
      });
    }
    return count;
  }

  async createIntent(data: CreateIntentDto) {
    const previousIntent = await this.prisma.intent.findUnique({
      where: {
        unique_intent: data,
        deleted: false,
      },
    });
    if (previousIntent) {
      throw new HttpException(
        `${data.intentType.toLowerCase()} already exists`,
        HttpStatus.CONFLICT,
      );
    }
    const intent = await this.prisma.intent.upsert({
      where: {
        unique_intent: data,
      },
      update: {
        deleted: false,
      },
      create: {
        ...data,
      },
    });
    await this.prisma.comment.update({
      where: {
        id: intent.targetId,
      },
      data: {
        totalLikes: {
          increment: 1,
        },
      },
    });
    return intent;
  }

  async updateIntent(data: UpdateIntentDto) {
    const intent = await this.prisma.intent.update({
      where: { id: data.id },
      data,
    });
    if (data.deleted && intent.targetModule === 'COMMENT') {
      await this.prisma.comment.update({
        where: {
          id: intent.targetId,
        },
        data: {
          totalLikes: {
            decrement: 1,
          },
        },
      });
    }
    return intent;
  }

  async getIntents(data: GetIntentDto) {
    const intents = await this.prisma.intent.findMany({
      where: { ...data, deleted: false },
    });
    return intents;
  }
}
