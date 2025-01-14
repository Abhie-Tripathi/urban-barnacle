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

  async createTracker(userId: string, data: CreateTrackerDto) {
    const tracker = await this.prisma.tracker.create({
      data: {
        name: data.name,
        filterValue: data.filterValue,
        type: data.type,
        createdByUser: {
          connect: {
            id: userId,
          },
        },
      },
    });
    return tracker;
  }

  async getTrackers(user: TCachedUser, data: GetTrackersDto) {
    const params = {};
    if (data.ids) params['id'] = { in: data.ids };
    if (data.name)
      params['name'] = { contains: data.name, mode: 'insensitive' };
    if (data.type)
      params['type'] = {
        in: Object.values(TrackerTypes[data.type]) as TrackerType[],
      };
    if (data.accountId) params['accountId'] = data.accountId;
    if (data.createdBy === 'me')
      params['createdByUser'] = { createdBy: user.id };
    const trackers = await this.prisma.tracker.findMany({
      where: {
        ...params,
        deleted: false,
      },
      skip: parseInt(data.offset),
      take: parseInt(data.limit),
      orderBy: {
        createdAt: 'desc',
      },
    });
    return trackers;
  }

  async getTrackersCount(user: TCachedUser, data: GetTrackersDto) {
    const params = {};
    if (data.ids) params['id'] = { in: data.ids };
    if (data.name)
      params['name'] = { contains: data.name, mode: 'insensitive' };
    if (data.type)
      params['type'] = {
        in: Object.values(TrackerTypes[data.type]) as TrackerType[],
      };
    if (data.accountId) params['accountId'] = data.accountId;
    if (data.createdBy === 'me')
      params['createdByUser'] = { createdBy: user.id };
    const count = await this.prisma.tracker.count({
      where: { ...params, deleted: false },
    });
    return count;
  }

  async updateTracker(data: UpdateTrackerDto) {
    const tracker = await this.prisma.tracker.update({
      where: { id: data.id },
      data,
    });
    return tracker;
  }
}
