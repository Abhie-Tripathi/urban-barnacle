import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { WidgetsService } from 'src/widgets/widgets.service';
import { FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import { Query_Dto } from 'src/promotedEvent/dto';
import { PublicApiDataService } from './public-api.data.service';
@Injectable()
export class PublicApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly widget: WidgetsService,
    private readonly publicApiDataService: PublicApiDataService,
  ) {}

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
