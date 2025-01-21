import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InterestStatus, Prisma } from '@prisma/client';
import { microserviceEndpoints } from 'src/utils/endpoints';
import { ConfigService } from '@nestjs/config';
import {
  CreateIntentDto,
  CreateUserEventInterestDto,
  GetIntentDto,
  GetUserEventInterestDto,
  UpdateIntentDto,
  UpdateUserEventInterestDto,
} from './dto/';
import {
  CreateEnquiryActivityDto,
  GetEnquiryActivityDto,
  UpdateEnquiryActivityDto,
} from './dto/enquiryActivity.dto';
import { EnquiryDataService } from 'src/enquiry/enquiry.data.service';

@Injectable()
export class IntentDataService {
  constructor(private readonly prisma: PrismaService) {}

  async createUserEventInterest(data: CreateUserEventInterestDto) {
    const userEventInterest = await this.prisma.userEventInterest.create({
      data: {
        ...data,
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
    const userEventInterests = await this.prisma.userEventInterest.findMany({
      where: { ...data, deleted: false },
    });
    return userEventInterests;
  }

  async getUserEventInterestCount(data: GetUserEventInterestDto) {
    const userEventInterests = await this.prisma.userEventInterest.count({
      where: { ...data, deleted: false },
    });
    return userEventInterests;
  }

  async createEnquiryActivity(data: CreateEnquiryActivityDto) {
    if (data.activityType === 'UPVOTE' && !data.activitySubType) {
      throw new HttpException(
        'Activity sub type is required for upvote activity',
        HttpStatus.BAD_REQUEST,
      );
    }
    const enquiryActivity = await this.prisma.enquiryActivity.create({
      data,
    });
    return enquiryActivity;
  }

  async updateEnquiryActivity(data: UpdateEnquiryActivityDto) {
    const enquiryActivity = await this.prisma.enquiryActivity.update({
      where: { id: data.id },
      data,
    });
    return enquiryActivity;
  }

  async getEnquiryActivities(data: GetEnquiryActivityDto) {
    const enquiryActivities = await this.prisma.enquiryActivity.findMany({
      where: { ...data, deleted: false },
    });
    return enquiryActivities;
  }

  async createIntent(data: CreateIntentDto) {
    const intent = await this.prisma.intent.create({
      data,
    });
    return intent;
  }

  async updateIntent(data: UpdateIntentDto) {
    const intent = await this.prisma.intent.update({
      where: { id: data.id },
      data,
    });
    return intent;
  }

  async getIntents(data: GetIntentDto) {
    const intents = await this.prisma.intent.findMany({
      where: { ...data, deleted: false },
    });
    return intents;
  }
}
