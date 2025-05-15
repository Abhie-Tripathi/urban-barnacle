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
        source: data.source,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstname: true,
            lastname: true,
            imageUrl: true,
          },
        },
        modifiedByUser: {
          select: {
            id: true,
            email: true,
            firstname: true,
            lastname: true,
            imageUrl: true,
          },
        },
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
    type TrackerWithAccessDate = Tracker & { accesscreatedAt: Date };

    const trackers: TrackerWithAccessDate[] = await this.prisma.$queryRaw`
      SELECT
        T.*,
        a."createdAt" "accesscreatedAt",
        json_build_object(
          'id', U.ID,
          'email', U.email,
          'firstName', U."firstname",
          'lastName', U."lastname",
          'imageUrl', U."imageUrl"
        ) as "createdByUser",
        json_build_object(
          'id', U2.ID,
          'email', U2.email,
          'firstName', U2."firstname",
          'lastName', U2."lastname",
          'imageUrl', U2."imageUrl"
        ) as "modifiedByUser"
      FROM
        "Tracker" T
        JOIN "User" U ON T."createdBy" = U.ID
        LEFT JOIN "User" U2 ON T."lastModifiedBy" = U2.ID
        JOIN "Access" A ON T.ID = A."sourceEntityId"::UUID
        AND A."sourceEntity" = 'TRACKER'
        AND A."accessReceiverId" = ${Prisma.sql`${user.id}::UUID`}
        AND A."accountId" = ${Prisma.sql`${user.accountId}::UUID`}
        AND A.deleted = false
      WHERE
        T.DELETED = false
          ${where.length > 0 ? Prisma.sql`AND ${Prisma.join(where, ' AND ')}` : Prisma.sql``}
      ORDER BY
        T."createdAt" DESC
      LIMIT
        ${limit}
      OFFSET
        ${offset}`;
    return trackers.map((tracker) => {
      const { accesscreatedAt, ...rest } = tracker;
      return { ...rest, createdAt: accesscreatedAt };
    });
  }

  async getTrackersCountByUser(
    user: TCachedUser,
    where: Prisma.Sql[],
    groupBy: string | null = null,
  ) {
    const trackerCount:
      | { count: number }[]
      | { count: number; type: TrackerType }[] = await this.prisma.$queryRaw`
      SELECT
        count(*) ${groupBy ? Prisma.sql`, "type"` : Prisma.sql``}
      FROM
        "Tracker" T
        INNER JOIN "Access" A ON T.ID = A."sourceEntityId"::UUID
        AND A."sourceEntity" = 'TRACKER'
        AND A."accessReceiverId" = ${Prisma.sql`${user.id}::UUID`}
        AND A."accountId" = ${Prisma.sql`${user.accountId}::UUID`}
      WHERE
        T.DELETED = false
          ${where.length > 0 ? Prisma.sql`AND ${Prisma.join(where, ' AND ')}` : Prisma.sql``}
          ${groupBy ? Prisma.sql`GROUP BY "type"` : Prisma.sql``}
          `;
    if (groupBy) {
      return trackerCount.map((val) => {
        return {
          type: val.type,
          count: Number(val.count),
        };
      });
    }
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

  async getTrackersCount(
    user: TCachedUser,
    data: GetTrackersDto,
    groupBy: string | null = null,
  ) {
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
    const count = await this.getTrackersCountByUser(user, where, groupBy);
    if (groupBy) {
      return count;
    }
    return Number(count);
  }

  async updateTracker(user: TCachedUser, data: UpdateTrackerDto) {
    const tracker = await this.prisma.tracker.update({
      where: { id: data.id },
      data: {
        ...data,
        lastModifiedBy: user.id,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstname: true,
            lastname: true,
            imageUrl: true,
          },
        },
        modifiedByUser: {
          select: {
            id: true,
            email: true,
            firstname: true,
            lastname: true,
            imageUrl: true,
          },
        },
      },
    });
    return tracker;
  }
}
