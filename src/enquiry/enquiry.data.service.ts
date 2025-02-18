import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateEnquiryDto,
  GetEnquiriesDto,
  GetEnquiryCountDto,
  UpdateEnquiryDto,
} from './dto';
import { GetCommentCountDto, GetCommentsDto } from 'src/comment/dto';

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
    const {
      ids,
      type,
      event_active_gte,
      event_active_lte,
      eventTypes,
      name,
      upvotedBy,
      limit,
      offset,
      status,
      ...rest
    } = data;
    const params: Prisma.EnquiryWhereInput = {
      ...rest,
      status: {
        in: status,
      },
    };
    if (ids) params['id'] = { in: ids };
    if (type)
      params['userInterests'] = {
        some: {
          interest: type,
        },
      };

    const endDate = event_active_gte
      ? {
          eventData: {
            path: ['startDate'],
            lte: event_active_lte,
          },
        }
      : null;
    const startDate = event_active_lte
      ? {
          eventData: {
            path: ['endDate'],
            gte: event_active_gte,
          },
        }
      : null;
    const eventName = name
      ? {
          eventData: {
            path: ['name_lower'],
            string_contains: name.toLowerCase(),
          },
        }
      : null;

    if (endDate || startDate || name) {
      params['AND'] = [];
      if (endDate) params['AND'].push(endDate);
      if (startDate) params['AND'].push(startDate);
      if (eventName) params['AND'].push(eventName);
    }
    // } else if (data.event_active_lte) params['eventData'] = endDate;
    // else if (data.event_active_gte) params['eventData'] = startDate;
    // else if (data.name) params['name'] = name;
    if ((upvotedBy === 'me' || upvotedBy === 'others') && !data.userId) {
      throw new HttpException(
        'userId is required when upvotedBy is me or others',
        HttpStatus.BAD_REQUEST,
      );
    }
    if ((upvotedBy === 'me' || upvotedBy === 'others') && data.userId) {
      const userId =
        upvotedBy === 'me' ? { equals: data.userId } : { not: data.userId };
      params['activities'] = {
        some: {
          activityType: 'UPVOTE',
          userId: userId,
        },
      };
    }
    const enquiries = await this.prisma.enquiry.findMany({
      where: params,
      include: {
        owner: true,
      },
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
    return enquiries;
  }

  async getEnquiryCount(data: GetEnquiryCountDto) {
    const {
      ids,
      type,
      event_active_gte,
      event_active_lte,
      name,
      upvotedBy,
      groupBy,
      status,
      ...rest
    } = data;
    const params: Prisma.EnquiryWhereInput = {
      ...rest,
      status: {
        in: status,
      },
    };
    if (ids) params['id'] = { in: ids };
    if (type)
      params['userInterests'] = {
        some: {
          interest: type,
        },
      };

    const endDate = event_active_gte
      ? {
          eventData: {
            path: ['startDate'],
            lte: event_active_lte,
          },
        }
      : null;
    const startDate = event_active_lte
      ? {
          eventData: {
            path: ['endDate'],
            gte: event_active_gte,
          },
        }
      : null;
    const eventName = name
      ? {
          eventData: {
            path: ['name_lower'],
            string_contains: name.toLowerCase(),
          },
        }
      : null;

    if (endDate || startDate || name) {
      params['AND'] = [];
      if (endDate) params['AND'].push(endDate);
      if (startDate) params['AND'].push(startDate);
      if (eventName) params['AND'].push(eventName);
    }
    // } else if (data.event_active_lte) params['eventData'] = endDate;
    // else if (data.event_active_gte) params['eventData'] = startDate;
    // else if (data.name) params['name'] = name;
    if ((upvotedBy === 'me' || upvotedBy === 'others') && !data.userId) {
      throw new HttpException(
        'userId is required when upvotedBy is me or others',
        HttpStatus.BAD_REQUEST,
      );
    }
    if ((upvotedBy === 'me' || upvotedBy === 'others') && data.userId) {
      const userId =
        upvotedBy === 'me' ? { equals: data.userId } : { not: data.userId };
      params['activities'] = {
        some: {
          activityType: 'UPVOTE',
          userId: userId,
        },
      };
    }
    if (groupBy) {
      const by: Prisma.EnquiryScalarFieldEnum[] = [];
      if (groupBy === 'status') {
        by.push('status');
      }
      const enquiryCount = await this.prisma.enquiry.groupBy({
        where: params,
        by: by,
        _count: {
          id: true,
        },
      });
      return enquiryCount;
    } else {
      const enquiryCount = await this.prisma.enquiry.count({
        where: params,
      });
      return enquiryCount;
    }
  }

  async updateEnquiry(data: UpdateEnquiryDto) {
    const enquiry = await this.prisma.enquiry.update({
      where: { id: data.id },
      data,
    });
    return enquiry;
  }

  async getComments(data: GetCommentsDto) {
    const { limit, offset, ...where } = data;
    const comments = await this.prisma.comment.findMany({
      where: {
        ...where,
        deleted: false,
      },
      include: {
        parentComment: {
          include: {
            user: true,
          },
        },
        user: true,
      },
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
    return comments;
  }

  async getCommentCount(data: GetCommentCountDto) {
    const commentCount = await this.prisma.comment.count({
      where: {
        ...data,
        deleted: false,
      },
    });
    return commentCount;
  }
}
