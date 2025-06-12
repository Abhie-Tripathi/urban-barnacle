import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrackerDto, GetTrackersDto, UpdateTrackerDto } from './dto';
import {
  ExportSubSource,
  Prisma,
  PrismaClient,
  Tracker,
  TrackerType,
  TrackerTypeTag,
} from '@prisma/client';
import { microserviceEndpoints } from 'src/utils/endpoints';
import { ConfigService } from '@nestjs/config';
import { QueueActionOptions, TCachedUser, TrackerTypes } from 'src/utils/types';
import { CommunicationService } from '../communication/communication.service';
import { trackerExportDto } from 'src/communication/bull.dto';
import { LimitDto } from 'src/global_dto';

@Injectable()
export class TrackerDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService
    ,
    private readonly configService: ConfigService,
  ) { }

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
  async getTrackerIntelScoreFromApi(params: any) {
    const queryParams = new URLSearchParams(
      params as unknown as Record<string, any>,
    );
    let url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.trackerIntelScore;
    console.log(url);
    let req: any = {};
    if (JSON.stringify(params).length > 500) {
      req = {
        method: 'POST',
        body: JSON.stringify(this.convertArrayValuesToStrings(params)),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    } else {
      url += '?' + queryParams.toString();
    }
    const response = await fetch(url,req);
    const data = await response.json();
    // console.dir(data, { depth: null });
    if (data['error']) {
      throw new HttpException(data['error'], HttpStatus.BAD_REQUEST);
    }
    return data;
  }
  async bulkInsertToSimilarTrackerEvent(
    data: {
      trackerId: string;
      eventId: string;
      count: number;
      tag: TrackerTypeTag;
      sourceId: number;
      score: number;
    }[],
  ) {
    return await this.prisma.similarEventsToTracker.createMany({ data: data });
  }
  async bulkDeleteToSimilarTrackerEvent(trackerId: string) {
    console.log({ sadaD: 'asdasd' });

    return await this.prisma.$executeRaw(
      Prisma.raw(
        `DELETE FROM "SimilarEventsToTracker" where id in (SELECT id FROM "SimilarEventsToTracker" where "trackerId"='${trackerId}');`,
      ),
    );
  }
  async getSimilarTrackerEvent(
    trackerId: string,
    tag: TrackerTypeTag,
    limit: number,
    offset: number,
  ) {
    return await Promise.all([this.prisma.$queryRaw<
      {
        sourceId: string;
        count: number;
        tag: string;
        score: number;
        eventId: string;
      }[]
    >(
      Prisma.raw(`
  SELECT "sourceId", count, tag, score,"eventId"
FROM "SimilarEventsToTracker"
where
    "trackerId" = '${trackerId}'
    and tag = '${tag}'
    and "createdAt"::DATE = now()::DATE
    ORDER BY score desc
    limit ${limit} Offset ${offset};`),
    ), this.prisma.$queryRaw<
      {
        count: number;
      }[]
    >(
      Prisma.raw(`
  SELECT count(*)
FROM "SimilarEventsToTracker"
where
    "trackerId" = '${trackerId}'
    and "createdAt"::DATE = now()::DATE;`),
    )]);
  }
  async createExport(data: {
    exportOf: ExportSubSource;
    inputData: any;
    trackerId: string;
  }, user: TCachedUser) {
    return await this.prisma.export.create({
      data: {
        userId: user.id,
        accountId: user.accountId,
        exportFileType: 'EXCEL',
        exportOf: data.exportOf,
        inputData: data.inputData,
        source: 'TRACKER',
        sourceId: data.trackerId,
        status: 'PENDING',
      },
      select: {
        id: true
      }
    })
  }
  async getTrackerExport(trackerId: string, user: TCachedUser, query: LimitDto) {
    return {
      trackerExports: await this.prisma.export.findMany({
        where: {
          source: 'TRACKER',
          sourceId: trackerId,
          deleted: false
        }, select: {
          id: true,
          fileSize: true,
          fileUrl: true,
          exportOf: true,
          createdAt: true,
          status: true,
          source: true,
          sourceId: true,
          user: {
            select: {
              firstname: true,
              lastname: true,
            }
          }
        },
        take: query.limit,
        skip: query.offset,
        orderBy: { createdAt: 'desc' }
      })
    }
  }
  async getTrackerExportCount(trackerId: string, user: TCachedUser, query: LimitDto) {
    return {
      count: await this.prisma.export.count({
        where: {
          source: 'TRACKER',
          sourceId: trackerId,
          deleted: false
        },
      })
    }
  }
  async createTrackerExportJob(
    body: trackerExportDto, userId: string
  ) {
    return await this.communicationService.createJobForBull(QueueActionOptions.SEND_TRACKER_EXPORT_MAIL, body, userId);
  }
  async deleteTrackerExport(exportId: string) {
    return await this.prisma.export.update({
      where: {
        id: exportId
      },
      data: {
        deleted: true
      }
    })
  }
  convertArrayValuesToStrings(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        // if (key === 'eventTypes') {

        //     result[key] = value.map(id => eventTypeDataIdToSlug[id].slug).join(',');
        // } else
        result[key] = value.join(',');
      } else {
        result[key] = value + '';
      }
    }
    return result;
  }
}
