import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrackerDto, GetTrackersDto, UpdateTrackerDto } from './dto';
import { Prisma, TrackerType } from '@prisma/client';
import { microserviceEndpoints } from 'src/utils/endpoints';
import { ConfigService } from '@nestjs/config';
import { TCachedUser, TrackerTypes } from 'src/utils/types';

@Injectable()
export class TrackerDataService {
  constructor(private readonly prisma: PrismaService) {}

  async createTracker(user: TCachedUser, data: CreateTrackerDto) {
    const tracker = await this.prisma.tracker.create({
      data: {
        name: data.name,
        filterValues: data.filterValues,
        type: data.type,
        createdBy: user.id,
        accountId: user.accountId,
      },
    });
    return tracker;
  }

  async getTrackers(data: GetTrackersDto, userId?: string) {
    const params: Prisma.TrackerWhereInput = {};
    if (data.ids && data.ids.length > 0) params['id'] = { in: data.ids };
    if (data.name)
      params['name'] = { contains: data.name, mode: 'insensitive' };
    if (data.type && data.type.length > 0) {
      params['type'] = {
        in:
          data.subType && data.subType.length > 0
            ? (Object.values(TrackerTypes[data.type]) as TrackerType[]).filter(
                (type) =>
                  data.subType &&
                  data.subType.length > 0 &&
                  data.subType.includes(type),
              )
            : (Object.values(TrackerTypes[data.type]) as TrackerType[]),
      };
    }
    if (data.accountId) params['accountId'] = data.accountId;
    if (data.createdBy && !userId) {
      throw new HttpException(
        'User id is required to filter by createdBy',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (data.createdBy === 'me' && userId) params['createdBy'] = userId;
    if (data.createdBy === 'others' && userId)
      params['createdBy'] = { not: userId };
    console.log({ params });
    const trackers = await this.prisma.tracker.findMany({
      where: {
        ...params,
        deleted: false,
      },
      skip: data.offset,
      take: data.limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
    return trackers;
  }

  async getTrackersCount(user: TCachedUser, data: GetTrackersDto) {
    const params: Prisma.TrackerWhereInput = {};
    if (data.ids && data.ids.length > 0) params['id'] = { in: data.ids };
    if (data.name)
      params['name'] = { contains: data.name, mode: 'insensitive' };
    if (data.type) {
      params['type'] = {
        in:
          data.subType && data.subType.length > 0
            ? (Object.values(TrackerTypes[data.type]) as TrackerType[]).filter(
                (type) =>
                  data.subType &&
                  data.subType.length > 0 &&
                  data.subType.includes(type),
              )
            : (Object.values(TrackerTypes[data.type]) as TrackerType[]),
      };
    }
    if (data.accountId) params['accountId'] = data.accountId;
    if (data.createdBy && user.id) {
      throw new HttpException(
        'User id is required to filter by createdBy',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (data.createdBy === 'me' && user.id) params['createdBy'] = user.id;
    if (data.createdBy === 'others' && user.id)
      params['createdBy'] = { not: user.id };

    const count = await this.prisma.tracker.count({
      where: { ...params, deleted: false },
    });
    return count;
  }

  async updateTracker(user: TCachedUser, data: UpdateTrackerDto) {
    const tracker = await this.prisma.tracker.update({
      where: { id: data.id },
      data: {
        ...data,
        lastModifiedBy: user.id,
      },
    });
    return tracker;
  }
}
