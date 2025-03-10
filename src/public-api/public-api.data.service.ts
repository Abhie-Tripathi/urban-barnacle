import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventType, Prisma } from '@prisma/client';

@Injectable()
export class PublicApiDataService {
  constructor(private readonly prisma: PrismaService) { }
  async calendarView(
    date_lte: string,
    date_gte: string,
    widgetId: string,
    calendarType: string,
    accountId: string,
  ) {
    const dataForCalendar = await this.prisma.$queryRaw<
      { event_month: string; total_events: number; details: string }[]
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
            INNER JOIN "_EventToWidget" ew ON e.id = ew."A"
        WHERE
            ew."B" = '${widgetId}'
            AND (e."data" ->> 'start_date')::DATE >= '2013-01-01'
            AND (e."data" ->> 'start_date')::DATE <= '${date_lte}'
            AND (e."data" ->> 'end_date')::DATE >= '${date_gte}'
            AND (e."data" ->> 'end_date')::DATE <= '2104-07-17'
             AND  e.deleted = false
            and e."accountId" = '${accountId}'
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
    ${calendarType === 'year'
          ? `TO_CHAR(ms.event_month, 'FMMonth YYYY') AS event_month`
          : ' ms.event_month '
        }
    ,
    COALESCE(SUM(de.totalevent), 0) AS total_events
   , STRING_AGG(de.detail, '[') AS details
FROM
    month_series ms
    LEFT JOIN DATAEVENT de
     ${calendarType === 'year'
          ? `
                       ON de.startdatetime >= ms.event_month 
        AND de.startdatetime < ms.event_month + INTERVAL '1 month'
            `
          : 'ON ms.event_month = de.startdatetime '
        }

GROUP BY
     ${calendarType === 'year'
          ? `TO_CHAR(ms.event_month, 'FMMonth YYYY')            `
          : ' ms.event_month '
        }
ORDER BY
     ${calendarType === 'year'
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
  }
  async getEventOrChildEvent(id: string) {
    const [dataOfevent, subevent] = await Promise.all([
      this.prisma.event.findFirst({
        where: {
          id: id,
          deleted: false,
        },
        select: {
          id: true,
          name: true,
          data: true,
          type: true,
          parentEventId: true,
          approval: true,
          capacity: true,
          registration: true,
          waitlisting: true,
        },
      }),
      this.prisma.event.findMany({
        where: {
          deleted: false,
          parentEventId: id,
        },
        select: {
          id: true,
          name: true,
          data: true,
          type: true,
          // approval: true,
          // capacity: true,
          // registration: true,
          // waitlisting: true,
        },
      }),
    ]);
    return { dataOfevent, subevent };
  }

  async getAccountId(id: string) {
    return (await this.prisma.account.findFirst({
      where: {
        id: id
      }
    }))
  }

  async findCountOfPromotedEvents(where: string, sortBy: string,
    sortType: string,
    limit: number,
    offset: number,) {
    const [count, eventData] = await Promise.all([this.prisma.$queryRaw<{ id: number }[]>(
      Prisma.raw(` SELECT count(distinct e.id) as id
                  FROM "Event" e 
                  ${where} ;`),
    ), this.prisma.$queryRaw<{
      id: string;
      name: string;
      data: Record<any, any>;
      createdAt: Date;
      type: EventType;
      approval: boolean;
      capacity: boolean;
      registration: boolean;
      waitlisting: boolean;
    }[]>(
      Prisma.raw(
        `
                SELECT e.id, e.name,e.type, e.data,e.approval,  e.capacity >0 OR e.capacity=-1 capacity, e.registration, e.waitlisting,e."createdAt" 
                 FROM "Event" e
            ${where}
             order by ${sortBy}  ${sortType}
          limit ${limit}  offset ${offset};`,
      ),
    )]);
    return { count, eventData };
  }
  async findManyChildPromotedEvent(ids: string[], userAccountId: string) {
    const subEventData = await this.prisma.$queryRaw<{
      id: string;
      name: string;
      data: Record<any, any>;
      createdAt: Date;
      parentEventId: string;
      type: EventType;
      approval: boolean;
      capacity: boolean;
      registration: boolean;
      waitlisting: boolean;
    }[]>(
      Prisma.raw(
        `
                SELECT e.id, e.name,e.type, e.data,e.approval,  e.capacity >0 OR e.capacity=-1 capacity, e.registration, e.waitlisting,e."createdAt",e."parentEventId" 
                 FROM "Event" e
            where e."parentEventId" in ('${ids.join("','")}') and e.deleted = false
            order by e."createdAt" desc
          limit 10  offset 0;`,
      ),
    );
    return { subEventData };
  }
}
