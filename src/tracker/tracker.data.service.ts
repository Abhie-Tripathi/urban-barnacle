import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrackerDto, GetTrackersDto, UpdateTrackerDto } from './dto';
import { Prisma, PrismaClient, Tracker, TrackerType } from '@prisma/client';
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

  async getTrackersByUser(
    user: TCachedUser,
    where: Prisma.Sql[],
    limit: number,
    offset: number,
  ) {
    const trackers: Tracker[] = await this.prisma.$queryRaw`
      SELECT
        T.*
      FROM
        "Tracker" T
        JOIN "Access" A ON T.ID = A."sourceEntityId"::UUID
        AND A."sourceEntity" = 'TRACKER'
        AND A."accessReceiverId" = ${Prisma.sql`${user.id}::UUID`}
        AND A."accountId" = ${Prisma.sql`${user.accountId}::UUID`}
      WHERE
        T.DELETED = false
          ${where.length > 0 ? Prisma.sql`AND ${Prisma.join(where, ' AND ')}` : Prisma.sql``}
      ORDER BY
        T."createdAt" DESC
      LIMIT
        ${limit}
      OFFSET
        ${offset}`;

    return trackers;
  }

  async getTrackersCountByUser(user: TCachedUser, where: Prisma.Sql[]) {
    const trackerCount: { count: number }[] = await this.prisma.$queryRaw`
      SELECT
        count(1)
      FROM
        "Tracker" T
        INNER JOIN "Access" A ON T.ID = A."sourceEntityId"::UUID
        AND A."sourceEntity" = 'TRACKER'
        AND A."accessReceiverId" = ${Prisma.sql`${user.id}::UUID`}
        AND A."accountId" = ${Prisma.sql`${user.accountId}::UUID`}
      WHERE
        T.DELETED = false
          ${where.length > 0 ? Prisma.sql`AND ${Prisma.join(where, ' AND ')}` : Prisma.sql``}
          `;
    console.log({ trackerCount });
    return trackerCount[0].count;
  }

  async getTrackers(data: GetTrackersDto, user: TCachedUser) {
    const where: Prisma.Sql[] = [];
    if (data.ids && data.ids.length > 0)
      where.push(Prisma.sql`T.ID::TEXT IN (${Prisma.join(data.ids, ',')})`);
    if (data.name) where.push(Prisma.raw(`T.NAME ILIKE '${`%${data.name}%`}'`));
    if (data.subType)
      where.push(Prisma.raw(`T.TYPE = '${data.subType}'::"TrackerType"`));
    if (data.type) {
      where.push(
        Prisma.raw(
          `T.TYPE::TEXT LIKE '${data.type === 'trackers' ? 'T\\_%' : data.type === 'trends' ? 'TR\\_%' : null}'`,
        ),
      );
    }
    if (data.createdBy) {
      if (data.createdBy === 'me')
        where.push(Prisma.raw(`T."createdBy" = '${user.id}'::UUID`));
      if (data.createdBy === 'others')
        where.push(Prisma.raw(`T."createdBy" != '${user.id}'::UUID`));
    }
    const trackers = await this.getTrackersByUser(
      user,
      where,
      data.limit,
      data.offset,
    );
    return trackers;
  }

  async getTrackersCount(user: TCachedUser, data: GetTrackersDto) {
    const where: Prisma.Sql[] = [];
    if (data.ids && data.ids.length > 0)
      where.push(Prisma.sql`T.ID::TEXT IN (${Prisma.join(data.ids, ',')})`);
    if (data.name) where.push(Prisma.raw(`T.NAME ILIKE '${`%${data.name}%`}'`));
    if (data.subType)
      where.push(Prisma.raw(`T.TYPE = '${data.subType}'::"TrackerType"`));
    if (data.type) {
      where.push(
        Prisma.raw(
          `T.TYPE::TEXT LIKE '${data.type === 'trackers' ? 'T\\_%' : data.type === 'trends' ? 'TR\\_%' : null}'`,
        ),
      );
    }
    if (data.createdBy) {
      if (data.createdBy === 'me')
        where.push(Prisma.raw(`T."createdBy" = '${user.id}'::UUID`));
      if (data.createdBy === 'others')
        where.push(Prisma.raw(`T."createdBy" != '${user.id}'::UUID`));
    }
    const count = await this.getTrackersCountByUser(user, where);
    return Number(count);
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
