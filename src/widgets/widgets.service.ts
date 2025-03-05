import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateDto, Widget } from './dto/create-widget.dto';
import { WidgetUpdate } from './dto/update-widget.dto';
import { Query_Dto } from './dto';
import { File } from '@nest-lab/fastify-multer';
import { ConfigService } from '@nestjs/config';
import { Prisma, WidgetStatus, WidgetType } from '@prisma/client';
import { WidgetDataService } from './widget.data.service';
import { SelectedUserDetails } from 'src/utils/types';
@Injectable()
export class WidgetsService {
  constructor(private readonly widgetDataService: WidgetDataService) { }

  async create(
    createWidgetDto: CreateDto,
    user: SelectedUserDetails,
    file: File,
  ) {
    try {
      if (createWidgetDto.widgetId) {
        // const updateKit = UpdateKitDto.parse(createWidgetDto);
        const dataForWidget = WidgetUpdate.parse(createWidgetDto);
        let eventId = {};
        if (createWidgetDto.eventId) {
          eventId['eventId'] = {
            connect: createWidgetDto.eventId.map((val) => {
              return { id: val };
            }),
          };
        }
        if (createWidgetDto.eventId && createWidgetDto.published === false) {
          const deleteEvent =
            await this.widgetDataService.deleteEventFromWidget(
              createWidgetDto.eventId,
              createWidgetDto.widgetId,
            );
          return {
            data: { message: 'data updated', id: createWidgetDto.widgetId },
          };
        }
        //       else if (createWidgetDto.published === false) {
        //         const deleteEvent = await this.prisma.$executeRaw(
        //           Prisma.raw(
        //             `
        //           DELETE FROM "_EventToWidget"
        // WHERE "B" = '${createWidgetDto.widgetId}';
        //           `,
        //           ),
        //         );
        //       }

        const updateWidget = await this.widgetDataService.updateWidget(
          createWidgetDto.widgetId,
          createWidgetDto.published ?? true,
          {
            ...dataForWidget,
            ...eventId,
          },
        );
        return { data: { message: 'data updated', id: updateWidget.id } };
      } else {
        const dto = Widget.parse(createWidgetDto);
        let eventId = {};
        if (createWidgetDto.eventId) {
          eventId['eventId'] = {
            connect: createWidgetDto.eventId?.map((val) => {
              return { id: val };
            }),
          };
        }
        const { check3, checkForBrandExists } = await this.widgetDataService.findKit(
          user.accountId,
          true,
          ''
        );
        const dataKit = check3;
        dto.type = dto.type as WidgetType;
        const data = await this.widgetDataService.createWidget({
          account: { connect: { id: user.accountId } },
          user: { connect: { id: user.id } },
          CustomBrandKit: { connect: { id: dataKit?.id ?? '' } },
          status: dto.status,
          templatePublicId: dto.templatePublicId,
          type: dto.type,
          customizationData: dto.customizationData,
          otherData: dto.otherData,
          domain: dto.domain,
          ...eventId,
        });

        return { data: { message: 'data inserted', id: data.id } };
      }
    } catch (error) {
      console.error('' + error);
      return { error };
    }
  }
  async getDraft(query: Query_Dto, userId: SelectedUserDetails) {
    try {
      if (!query.status) {
        query.status = 'draft';
      }
      const count = await this.widgetDataService.getWidgetCount(
        userId.accountId,
        query.status.toLowerCase() as WidgetStatus,
      );
      const data = await this.widgetDataService.findManyWidget(
        userId.accountId,
        query.status.toLowerCase() as WidgetStatus,
        Number(query.limit),
        Number(query.offset),
      );
      return {
        data: {
          totalCount: count.id,
          data: data.map((val) => {
            if (val.otherData === null) val.otherData = [];
            return val;
          }),
        },
      };
    } catch (error) {
      console.error('' + error);
      return { error };
    }
  }
  async getWidgetById(id: string, query, accountId: string) {
    try {
      console.log(query, id, accountId);
      let dataEvent: object = {};
      let where: object = {};
      if (query.eventInfo) {
        dataEvent = { data: true, name: true, type: true };
        where = {
          status: 'active',
          eventId: {
            some: {
              published: true,
            },
          },
        };
      }
      const data = await this.widgetDataService.findUniqueWidget(
        {
          id: id,
          accountId: accountId,
          deleted: false,
          ...where,
        },
        dataEvent,
      );
      if (data?.otherData === null) {
        data.otherData = [];
      }
      console.log(data);

      if (query.eventInfo) {
        return {
          data: {
            widgetData: {
              id: data?.id ?? null,
              type: data?.type ?? null,
              status: data?.status ?? null,
              customizationData: data?.customizationData,
              templatePublicId: data?.templatePublicId ?? null,
              otherdata: data?.otherData ?? null,
            },
            eventData: data?.eventId.map((val: any) => {
              const dataOfEvent: any = val.data;
              return {
                id: val.id,
                name: val.name,
                ...dataOfEvent,
                type: val.type,
                customizationData: dataOfEvent?.customizationData
                  ? JSON.parse(
                    dataOfEvent.customizationData.toString() as string,
                  )
                  : null,
              };
            }),
          },
        };
      }
      if (query.eventId) {
        return {
          data: {
            event: ((data?.otherData as { event: any[] }).event as any[]).find(
              (val) => val.id === query.eventId,
            ),
          },
        };
      }
      return { data: data };
    } catch (error) {
      console.error('' + error);
      return { error };
    }
  }
}
export interface EventDetails {
  venue?: string;
  latitude?: number;
  bannerUrl?: string;
  eventFont?: string;
  longitude?: number;
  pageBgColor?: string;
  registerBtnText?: string;
  registerMessage?: string;
  registerBtnColor?: string;
  speakerProfilesData?: any[];
  participationMessage?: string;
  name?: string;
  format?: string;
  end_date?: string;
  end_time?: string;
  gmt_time?: string;
  start_date?: string;
  start_time?: string;
  description?: string;
  location_city?: string;
  location_country?: string;
}
