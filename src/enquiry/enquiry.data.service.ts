import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateEnquiryDto, GetEnquiriesDto, UpdateEnquiryDto } from './dto';

@Injectable()
export class EnquiryDataService {
  constructor(private readonly prisma: PrismaService) {}

  async createEnquiry(data: CreateEnquiryDto) {
    const enquiry = await this.prisma.enquiry.create({
      data,
    });
    return enquiry;
  }

  async getEnquiries(data: GetEnquiriesDto) {
    const params = {};
    if (data.accountId) params['accountId'] = data.accountId;
    if (data.eventId) params['eventId'] = data.eventId;
    if (data.initiatedBy) params['initiatedBy'] = data.initiatedBy;
    if (data.type)
      params['userInterests'] = {
        some: {
          interest: data.type,
        },
      };
    const endDate = data.event_active_gte
      ? {
          path: ['startDate'],
          lte: data.event_active_lte,
        }
      : {};
    const startDate = data.event_active_lte
      ? {
          path: ['endDate'],
          gte: data.event_active_gte,
        }
      : {};
    if (data.event_active_gte && data.event_active_gte) {
      params['AND'] = [
        {
          eventData: startDate,
        },
        {
          eventData: endDate,
        },
      ];
    } else if (data.event_active_lte) params['eventData'] = endDate;
    else if (data.event_active_gte) params['eventData'] = startDate;
    if (
      (data.upvotedBy === 'me' || data.upvotedBy === 'others') &&
      !data.userId
    ) {
      throw new HttpException(
        'userId is required when upvotedBy is me or others',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      (data.upvotedBy === 'me' || data.upvotedBy === 'others') &&
      data.userId
    ) {
      const userId =
        data.upvotedBy === 'me'
          ? { equals: data.userId }
          : { not: data.userId };
      params['activities'] = {
        some: {
          activityType: 'UPVOTE',
          userId: userId,
        },
      };
    }
    const enquiries = await this.prisma.enquiry.findMany({
      where: params,
      skip: data.offset,
      take: data.limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
    return enquiries;
  }

  async updateEnquiry(data: UpdateEnquiryDto) {
    const enquiry = await this.prisma.enquiry.update({
      where: { id: data.id },
      data,
    });
    return enquiry;
  }
}
