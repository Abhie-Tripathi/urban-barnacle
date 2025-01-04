import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateDto, CreateWidgetKitDto, Widget } from './dto/create-widget.dto';
import { UpdateWidgetKitDto, WidgetUpdate } from './dto/update-widget.dto';
import { Query_Dto } from './dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { TCachedUser } from 'src/shared/types';
import { File } from '@nest-lab/fastify-multer';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { Prisma, WidgetStatus, WidgetType } from '@prisma/client';
@Injectable()
export class WidgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async create(createWidgetDto: CreateDto, user: TCachedUser, file: File) {
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
          const deleteEvent = await this.prisma.$executeRaw(
            Prisma.raw(
              `
            DELETE FROM "_EventToWidget" 
  WHERE "A" IN ('${createWidgetDto.eventId.join("','")}') And
  "B" = '${createWidgetDto.widgetId}';
            `,
            ),
          );
          return {
            data: { message: 'data updated', id: createWidgetDto.widgetId },
          };
        } else if (createWidgetDto.published === false) {
          const deleteEvent = await this.prisma.$executeRaw(
            Prisma.raw(
              `
            DELETE FROM "_EventToWidget" 
  WHERE "B" = '${createWidgetDto.widgetId}';
            `,
            ),
          );
        }
        const updateWidget = await this.prisma.widget.update({
          where: {
            id: createWidgetDto.widgetId,
          },
          data: {
            ...dataForWidget,
            ...eventId,
          },
          select: {
            id: true,
          },
        });
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
        const dataKit = await this.prisma.customBrandKit.findFirst({
          where: {
            accountId: user.accountId,
          },
          select: {
            id: true,
          },
        });
        dto.type = dto.type as WidgetType;
        const data = await this.prisma.widget.create({
          data: {
            account: { connect: { id: user.accountId } },
            user: { connect: { id: user.id } },
            CustomBrandKit: { connect: { id: dataKit.id ?? '' } },
            status: dto.status,
            templatePublicId: dto.templatePublicId,
            type: dto.type,
            customizationData: dto.customizationData,
            otherData: dto.otherdata,
            domain: dto.domain,
            ...eventId,
          },
        });

        return { data: { message: 'data inserted', id: data.id } };
      }
    } catch (error) {
      console.error('' + error);
      return {
        error: new HttpException(
          'Internal Server down',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
    }
  }
  async getDraft(query: Query_Dto, userId: TCachedUser) {
    try {
      if (!query.status) {
        query.status = 'draft';
      }
      const count = await this.prisma.widget.count({
        where: {
          accountId: userId.accountId,
          status: query.status.toLowerCase() as WidgetStatus,
          deleted: false,
        },
        select: {
          id: true,
        },
      });
      const data = await this.prisma.widget.findMany({
        where: {
          accountId: userId.accountId,
          status: query.status.toLowerCase() as WidgetStatus,
          deleted: false,
        },
        select: {
          id: true,
          type: true,
          status: true,
          customizationData: true,
          templatePublicId: true,
          otherData: true,
          domain: true,
          eventId: {
            select: {
              id: true,
            },
          },
        },
        take: query.limit,
        skip: query.offset,
      });
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
      return {
        error: new HttpException(
          'Internal Server down',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
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
      const data = await this.prisma.widget.findUnique({
        where: {
          id: id,
          accountId: accountId,
          deleted: false,
          ...where,
        },
        select: {
          id: true,
          type: true,
          status: true,
          customizationData: true,
          templatePublicId: true,
          otherData: true,
          domain: true,
          eventId: {
            select: {
              id: true,
              ...dataEvent,
            },
          },
        },
      });
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
      return {
        error: new HttpException(
          'Internal Server down',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
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
