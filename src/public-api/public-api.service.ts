import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { WidgetsService } from 'src/widgets/widgets.service';
import { FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import { Query_Dto } from 'src/promotedEvent/dto';
@Injectable()
export class PublicApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly widget: WidgetsService,
  ) {}
  async calendarView(
    date_lte: string,
    date_gte: string,
    widgetId: string,
    calendarType: string,
    accountId: string,
  ) {
    try {
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
  async getWidgetById(id: string, req: FastifyRequest, query: Query_Dto) {
    try {
      // console.log(
      //   `Memory Limit: ${v8.getHeapStatistics().heap_size_limit / 1024 / 1024} MB`,
      // );
      // for (let index = 0; index < 1000; index++) {
      //   for (let index1 = 0; index1 < 4_00_000; index1++) {
      //     console.log('loop', index1);
      //   }
      // }
      // const userData = await this.getUser();
      // if (userData === null) {
      //   return {
      //     error: new HttpException(
      //       'unable to access the public api',
      //       HttpStatus.EXPECTATION_FAILED,
      //     ),
      //   };
      // }
      const companyId = await this.prisma.widget.findFirst({
        where: {
          id: id,
        },
        select: {
          domain: true,
          accountId: true,
        },
      });
      // console.log(companyId, req);
      const reqBaseUl: string = req.headers.origin || ''; //req.protocol + '://' + req.hostname;
      const widgetDomain: string[] = companyId?.domain?.split(',') ?? [];
      // const origin: string[] = JSON.parse(process.env.ORIGIN ?? '');
      // widgetDomain.push(...origin);
      // console.log(
      //   { origin },
      //   { widgetDomain },
      //   { reqBaseUl },
      //   { req: req.originalUrl },
      //   {referer:req.headers.re}
      // );

      if (widgetDomain.includes(reqBaseUl)) {
        if (
          query.views &&
          query.views === 'calendar' &&
          query.start_date &&
          query.end_date &&
          id &&
          query.calendarType
        ) {
          return await this.calendarView(
            query.end_date,
            query.start_date,
            id,
            query.calendarType,
            companyId?.accountId ?? '',
          );
        } else {
          return await this.widget.getWidgetById(
            id,
            { eventInfo: true, widgetData: true },
            companyId?.accountId ?? '',
          );
        }
      }
      return {
        error: new HttpException('domain not allowed', HttpStatus.FORBIDDEN),
      };
    } catch (error) {
      console.error(JSON.stringify(error + 'aaaaaaaaaaaaaaaaaaaa'));
      return {
        error: new HttpException(
          'Something went wrong',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
    }
  }
  async getWidgetEventById(id: string) {
    try {
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
            // approval: true,
            // capacity: true,
            // registration: true,
            // waitlisting: true,
          },
        }),
      ]);
      const paraentData: object = {};
      if (dataOfevent?.parentEventId) {
        const eventsdata = await this.prisma.event.findFirst({
          where: {
            deleted: false,
            id: dataOfevent.parentEventId,
          },
          select: {
            id: true,
            name: true,
          },
        });
        paraentData['id'] = eventsdata?.id;
        paraentData['name'] = eventsdata?.name;
      }
      const dataevent: any = dataOfevent?.data;
      dataevent['customizationData'] = JSON.parse(
        dataevent['customizationData'],
      );
      const maxCapacity = (dataOfevent?.data as any)['maxCapacity'] ?? 0;
      // console.log({ dataOfevent }, { subevent });

      return {
        data: {
          event: {
            id: dataOfevent?.id,
            name: dataOfevent?.name,
            type: 'MAIN',
            data: {
              ...dataevent,
              children: subevent.map((event) => {
                const data: any = event.data;
                data['customizationData'] = JSON.parse(
                  data['customizationData'],
                );
                return { ...event, data: data, type: 'SUB' };
              }),
            },
            parentInfo: { ...paraentData },
            capacity: maxCapacity > 0 || maxCapacity === -1 ? true : false,
            registration: dataOfevent?.registration,
            approval: dataOfevent?.approval,
            waitlisting: dataOfevent?.waitlisting,
          },
        },
      };
    } catch (error) {
      console.error(error);
      console.log(error);
      return {
        error: new HttpException(
          'Something went wrong',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
    }
  }
}
