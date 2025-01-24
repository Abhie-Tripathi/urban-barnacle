import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CommunicationService } from 'src/communication/communication.service';
import { EventCancelDataSchema } from '../../src/communication/bull.dto';
import { QueueActionOptions } from 'src/utils/types';

@Injectable()
export class PromotedEventsDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
  ) {}
  async getEventForGeni(id: string) {
    const [data, iddWid] = await Promise.all([
      this.prisma.event.findFirst({
        where: {
          id: id,
          deleted: false,
        },
        select: {
          id: true,
          name: true,
          data: true,
          parentEventId: true,
          approval: true,
          capacity: true,
          registration: true,
          waitlisting: true,
        },
      }),
      this.prisma.$queryRaw<{ id: string }[]>(
        Prisma.raw(`
              SELECT "B" as id
              FROM "_EventToWidget"
              WHERE "A" = '${id}';
            `),
      ),
    ]);
    console.log({ iddWid });

    const widgetData = await this.prisma.widget.findMany({
      where: { id: { in: iddWid.map((val) => val.id) } },
      select: {
        type: true,
        templatePublicId: true,
      },
    });
    return { data, iddWid, widgetData };
  }
  async createAttachement(data: any) {
    const upload = await this.prisma.attachment.create({
      data: {
        ...data,
      },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileType: true,
      },
    });
    return upload;
  }
  async createPromotedEvent(data: any) {
    const create = await this.prisma.event.create({
      data: {
        ...data,
      },
      select: {
        id: true,
        name: true,
        data: true,
      },
    });
    return create;
  }
  async updatePromotedEvent(data: any, eventId: string) {
    const update = await this.prisma.event.update({
      where: {
        id: eventId,
      },
      data: {
        ...data,
      },
    });
    return update;
  }
  async findUniquePromotedEvent(where: any) {
    const eventData = await this.prisma.event.findFirst({
      where: {
        ...where,
      },
    });
    return eventData;
  }
  async findCountOfPromotedEvents(userAccountId: string, where: string) {
    const count = (await this.prisma.$queryRaw(
      Prisma.raw(` SELECT count(distinct e.id) as id
                FROM "Event" e where e.deleted = false
                and e."accountId"
                 = '${userAccountId}' 
                ${where} ;`),
    )) as { id: number }[];
    return count;
  }
  async findManyPromotedEvents(
    userAccountId: string,
    where: string,
    sortBy: string,
    sortType: string,
    limit: string,
    offset: string,
  ) {
    const data = (await this.prisma.$queryRaw(
      Prisma.raw(
        `
              SELECT e.id, e.name, e.data,e.approval, e.capacity, e.registration, e.waitlisting,e."createdAt" 
               FROM "Event" e
            where e.deleted = false  and (e."parentEventId" is null OR e."parentEventId"::TEXT ='')
        and e."accountId" = '${userAccountId}'
          ${where}
          order by ${sortBy}  ${sortType}
          limit ${limit}  offset ${offset};`,
      ),
    )) as {
      id: string;
      name: string;
      data: Record<any, any>;
      createdAt: Date;
    }[];
    return data;
  }
  async findManyChildPromotedEvent(ids: string[], userAccountId: string) {
    const subEentId = await this.prisma.event.findMany({
      where: {
        accountId: userAccountId,
        deleted: false,
        parentEventId: { in: ids },
      },
      select: {
        id: true,
        parentEventId: true,
      },
    });
    return subEentId;
  }
  async getLinkedEventData(
    widgetId: string | undefined,
    eventId: string,
    subEventIds: string[],
  ) {
    const [iddWid, isLinked, childSubEvent] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>(
        Prisma.raw(`
              SELECT "B" as id
              FROM "_EventToWidget"
              WHERE "A" = '${eventId}';
            `),
      ),
      this.prisma.$queryRaw<{ id: number }[]>(
        Prisma.raw(`
              SELECT count("A") as id
              FROM "_EventToWidget"
              WHERE 
                ${widgetId ? `"B" = '${widgetId}'` : `"B"::TEXT = ''`}
                AND "A" = '${eventId}';
            `),
      ),
      this.prisma.event.findMany({
        where: {
          id: { in: subEventIds },
          deleted: false,
        },
        select: {
          id: true,
          name: true,
          data: true,
        },
      }),
    ]);

    const widgetData = await this.prisma.widget.findMany({
      where: { id: { in: iddWid.map((val) => val.id) } },
      select: {
        type: true,
        templatePublicId: true,
      },
    });
    return { iddWid, isLinked, childSubEvent, widgetData };
  }
  async getCountForChildEventForWidget(
    widgetId: string | undefined,
    eventId: string,
  ) {
    const chileLinkedToWidget = await this.prisma.$queryRaw<{ id: number }[]>(
      Prisma.raw(`
      SELECT count("A") as id
      FROM "_EventToWidget"
      WHERE ${widgetId ? `"B" = '${widgetId}'` : `"B"::TEXT = ''`}
       and "A"= '${eventId}';
    `),
    );
    return chileLinkedToWidget;
  }
  async calendarView(
    date_lte: string,
    date_gte: string,
    widgetId: string,
    calendarType: string,
    companyId: string,
    where: string,
  ) {
    try {
      const dataForCalendar = await this.prisma.$queryRaw<
        {
          event_month: string;
          total_events: number;
          details: string;
        }[]
      >(
        Prisma.raw(
          `
          WITH
      DATAEVENT AS (
          SELECT
              (e."data" ->> 'start_date')::DATE AS startdatetime,
              (e."data" ->> 'end_date')::DATE AS enddatetime,
              COUNT(DISTINCT e."id") AS totalevent
            , STRING_AGG(
                 e."id" || ']' || e."name" || ']', '['
           ) AS detail
          FROM
              "Event" e
          ${
            widgetId === 'null'
              ? ' where '
              : `INNER JOIN "_EventToWidget" ew ON e.id = ew."A"
          WHERE
              ew."B" = '${widgetId}'
              AND `
          } e.deleted = false
              and e."accountId" = '${companyId}'
              ${
                where.length > 5
                  ? where
                  : `
              and (e."data" ->> 'start_date')::DATE >= '2013-01-01'
              AND (e."data" ->> 'start_date')::DATE <= '${date_lte}'
              AND (e."data" ->> 'end_date')::DATE >= '${date_gte}'
              AND (e."data" ->> 'end_date')::DATE <= '2104-07-17'`
              }
          GROUP BY
              (e."data" ->> 'start_date'),
              (e."data" ->> 'end_date')
      ),
         month_series AS (
          SELECT
              GENERATE_SERIES(
                  '${date_gte}'::DATE, '${date_lte}'::DATE, INTERVAL '${calendarType === 'year' ? '1 month' : '1 day'}'
              )::DATE AS event_month
      )
  SELECT
      ${
        calendarType === 'year'
          ? `TO_CHAR(ms.event_month, 'FMMonth YYYY') AS event_month`
          : ' ms.event_month '
      }
      ,
      COALESCE(SUM(de.totalevent), 0) AS total_events
     , STRING_AGG(de.detail, '[') AS details
  FROM
      month_series ms
      LEFT JOIN DATAEVENT de
       ${
         calendarType === 'year'
           ? `
                        ON de.startdatetime >= ms.event_month 
          AND de.startdatetime < ms.event_month + INTERVAL '1 month'
              `
           : 'ON ms.event_month = de.startdatetime '
       }
  
  GROUP BY
       ${
         calendarType === 'year'
           ? `TO_CHAR(ms.event_month, 'FMMonth YYYY')            `
           : ' ms.event_month '
       }
  ORDER BY
       ${
         calendarType === 'year'
           ? `TO_CHAR(ms.event_month, 'FMMonth YYYY')            `
           : 'ms.event_month  '
       } 
          `,
        ),
      );
      const dataToReturn: object[] = [];
      dataForCalendar.map((val) => {
        if (calendarType === 'year') {
          dataToReturn.push({
            date: val.event_month.split(' ')[0],
            totalEvents: Number(val.total_events),
            // eventDetails: detailsArray,
          });
        } else if (calendarType === 'month') {
          const allEvent: string[] = val?.details?.split('[') ?? [];
          const detailsArray: object[] = [];
          for (const event of allEvent) {
            const eventData: string[] = event.split(']');
            detailsArray.push({
              id: eventData[0],
              name: eventData[1],
            });
          }
          dataToReturn.push({
            date: val.event_month,
            totalEvents: Number(val.total_events),
            eventDetails: detailsArray,
          });
        }
      });
      return { data: dataToReturn };
    } catch (error) {
      console.log(error);
      console.error(error);
      return {
        error: new HttpException(
          'Internal Server down',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
    }
  }
  async deletePromotedEvent(eventId: string) {
    const wigId = (await this.prisma.$queryRaw(
      Prisma.raw(
        `select "B" as id FROM "_EventToWidget"
WHERE "A" = '${eventId}';
    `,
      ),
    )) as { id: string }[];
    for (const ids of wigId) {
      const widgetData = await this.prisma.widget.findFirst({
        where: {
          id: ids.id,
        },
        select: {
          otherData: true,
        },
      });

      const data = widgetData?.otherData as { event: any[] };
      const newotherData: any[] = [];
      const deleteEvent = await this.prisma.$executeRaw(
        Prisma.raw(
          `
        DELETE FROM "_EventToWidget" a
WHERE a."A" = '${eventId}';

        `,
        ),
      );
      console.log('delete', deleteEvent);
      for (const dataOF of data?.event ?? []) {
        if (dataOF.id !== eventId) {
          newotherData.push(dataOF);
        }
      }
      const updateWidc = await this.prisma.widget.update({
        where: {
          id: ids.id,
        },
        data: {
          otherData: { event: newotherData },
        },
      });
    }
    return 'deleted';
  }
  async getWidgetIdLinkedWithEvent(widgetId: string, eventids: string) {
    const widgetEvent = (await this.prisma.$queryRaw(
      Prisma.raw(`
           SELECT "A" as id from
           "_EventToWidget"
      where
           "B" = '${widgetId}'
        AND "A" IN ('${eventids}');
          ;
            `),
    )) as { id: string }[];
    return widgetEvent;
  }
  async getEventCreator(eventId: string) {
    const eventDta = await this.prisma.event.findFirst({
      where: {
        id: eventId,
      },
      select: {
        data: true,
        name: true,
        capacity: true,
        User: {
          select: {
            email: true,
          },
        },
      },
    });
    return eventDta;
  }
  async getUserRegisteredForPromotedEvent(accountId: string, eventId: string) {
    const data = await this.prisma.userEventInterest.findMany({
      where: {
        accountId: accountId,
        eventId: eventId,
        sourceModule: 'PROMOTED_EVENT',
      },
      select: {
        interestedUser: {
          select: {
            email: true,
          },
        },
      },
    });
    return data;
  }
  async createEventCancelJob(
    data: typeof EventCancelDataSchema,
    userId: string,
  ) {
    await this.communicationService.createJobForBull(
      QueueActionOptions.SEND_EVENT_CANCEL_EMAIL,
      data,
      userId,
    );
  }
}
