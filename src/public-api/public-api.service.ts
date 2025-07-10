import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { WidgetsService } from 'src/widgets/widgets.service';
import { FastifyRequest } from 'fastify';
import { EventType, Prisma } from '@prisma/client';
import { Query_Dto } from 'src/promotedEvent/dto';
import { PublicApiDataService } from './public-api.data.service';
import { EventsService } from 'src/events/events.service';
import { QueryDto } from 'src/events/dto';
@Injectable()
export class PublicApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly widget: WidgetsService,
    private readonly publicApiDataService: PublicApiDataService,
    private readonly eventService: EventsService,
  ) { }

  async getWidgetById(id: string, req: FastifyRequest, query: Query_Dto) {
    try {
      const companyId = await this.prisma.widget.findFirst({
        where: {
          id: id,
        },
        select: {
          domain: true,
          accountId: true,
        },
      });
      const reqBaseUl: string = req.headers.origin || '';
      const widgetDomain: string[] = companyId?.domain?.split(',') ?? [];

      if (widgetDomain.includes(reqBaseUl)) {
        if (
          query.views &&
          query.views === 'calendar' &&
          query.start_date &&
          query.end_date &&
          id &&
          query.calendarType
        ) {
          return await this.publicApiDataService.calendarView(
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
      throw new HttpException('domain not allowed', HttpStatus.FORBIDDEN);
    } catch (error) {
      console.error(JSON.stringify(error + 'aaaaaaaaaaaaaaaaaaaa'));
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getWidgetEventById(id: string) {
    try {
      const { dataOfevent, subevent } =
        await this.publicApiDataService.getEventOrChildEvent(id);
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
            type: dataOfevent?.type,
            data: {
              ...dataevent,
              children: subevent.map((event) => {
                const data: any = event.data;
                data['customizationData'] = JSON.parse(
                  data['customizationData'],
                );
                return { ...event, data: data };
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
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCompanyEvents(id: string, query: Query_Dto) {
    try {
      const accountIdData = await this.publicApiDataService.getAccountId(id);
      if (!accountIdData) {
        throw new HttpException('invalid company', HttpStatus.NOT_FOUND);
      }
      let where: string = `  where e."accountId"='${accountIdData.id}' 
      and e.deleted = false and (e."parentEventId" is null OR e."parentEventId"::TEXT ='') `;
      if (query.expired === 'true') {
        where += ` and (e.data->>'end_date')::DATE < '${new Date(query.expired).toISOString()}' `;
      }
      if (query.upcoming === 'true') {
        where += ` AND (
                   (e.data->>'start_date')::DATE >= CURRENT_DATE
                   OR (
                       CURRENT_DATE BETWEEN (e.data->>'start_date')::DATE 
                                       AND (e.data->>'end_date')::DATE
                   )
               )`;
      }
      const { count, eventData } = await this.publicApiDataService.findCountOfPromotedEvents(where, query.sortBy || 'e."createdAt"', query.sortType || 'desc', query.limit, query.offset);
      const { subEventData } = await this.publicApiDataService.findManyChildPromotedEvent(eventData.map(val => val.id), accountIdData.id);
      const eventToSubEventMap = new Map<string, {
        id: string;
        name: string;
        data: Record<any, any>;
        createdAt: Date;
        type: EventType;
        approval: boolean;
        capacity: boolean;
        registration: boolean;
        waitlisting: boolean;
        parentEventId: string;
      }[]>();

      for (const data of subEventData) {
        if (!eventToSubEventMap.has(data.parentEventId)) {
          eventToSubEventMap.set(data.parentEventId, []);
        }
        const childdata: any = data.data;
        childdata['customizationData'] = childdata['customizationData']
          ? JSON.parse(childdata['customizationData'])
          : {};
        eventToSubEventMap.get(data.parentEventId)?.push({ ...data, data: childdata });
      }
      const dataToreturn: { totalCount: number, events: object[] } = { totalCount: Number(count[0].id), events: [] };
      for (const event of eventData) {
        const customizationData: any = event.data;
        customizationData['customizationData'] = customizationData['customizationData']
          ? JSON.parse(customizationData['customizationData'])
          : {};
        dataToreturn.events.push({ ...event, data: customizationData, child: eventToSubEventMap.get(event.id) });
      }
      return { data: dataToreturn };
    } catch (error) {
      console.error(error);
      console.log(error);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getPresetEvents(query: QueryDto) {
    if ((query.limit || 10) + (query.offset || 0) > 100) {
      throw new HttpException(
        `Invalid request`,
        HttpStatus.NOT_ACCEPTABLE,
      );
    }
    return await this.eventService.getAllEvents(query);
  }
}
