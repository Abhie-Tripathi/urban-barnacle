// createEvent : create a new event
// createEventEdition : create a new event edition
// getAllEvents : get all events

import { HttpException, HttpStatus, Injectable, Req } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as crypto from 'crypto';
import {
  CreateEventDto,
  EventDetailsSchema,
  EventSpeakerDto,
  Query_Dto,
  UpdateEventDto,
} from './dto';
import { SelectedUserDetails } from 'src/utils/types';
import { File } from '@nest-lab/fastify-multer';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { Interest, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PosterService } from './poster.service';
import { FileCreationService } from 'src/shared/file-creation.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PromotedEventsDataService } from './promoted-even.data.service';
import { fetchDatafromMicroService } from 'src/shared/microservice.api';
@Injectable()
export class PromotedEventsService {
  constructor(
    private readonly eventDataService: PromotedEventsDataService,
    private configService: ConfigService,
    private readonly posterService: PosterService,
    private readonly fileCreate: FileCreationService,
    // @InjectQueue('eventProcessor') private readonly eventCanelQueue: Queue,
  ) { }

  async getGeniEventById(id: string) {
    try {
      const { data, iddWid, widgetData } =
        await this.eventDataService.getEventForGeni(id);
      const eventData: any = data?.data;
      eventData['customizationData'] = JSON.parse(
        eventData['customizationData'],
      );
      return {
        data: {
          ...data,
          data: eventData,
          widgetData: widgetData,
        },
      };
    } catch (error) {
      return { error };
    }
  }
  // async getEventById(id: string, query) {
  //   try {
  //     if (query.source === 'eventgeni') {
  //       return await this.geniEventById(id);
  //     }
  //     // const baseURL = this.configService.get('MICROSERVICE_URL') || '';
  //     // const endpoint = '/event';
  //     // const queryString = new URLSearchParams(query).toString();
  //     // const url = `${baseURL}${endpoint}/${id}?${queryString}`;
  //     // try {
  //     //   const response = await fetch(url, {
  //     //     method: 'GET',
  //     //   });

  //     //   // if (!response.ok) {
  //     //   //   throw new Error(`Error fetching categories: ${response.statusText}`);
  //     //   // }

  //     //   const data = await response.json();
  //     //   return data;
  //     // } catch (error) {
  //     //   console.error('Error fetching categories:', error);
  //     //   // throw error;
  //     // }
  //   } catch (error: any) {
  //     throw new HttpException('something went wrong', HttpStatus.BAD_REQUEST);
  //   }
  // }



  async createEvent(
    body: CreateEventDto,
    file: File,
    user: SelectedUserDetails,
  ) {
    try {
      // let jsonDta = {};
      let attachment_id: string | null = null;
      let jsonDta = EventDetailsSchema.parse(JSON.parse(body.data));
      console.log('file', { ...file });

      if (file.buffer) {
        const fileName =
          randomUUID() +
          file.originalname.substring(file.originalname.lastIndexOf('.'));
        const { fileData, error } = await this.fileCreate.createFile(
          fileName,
          file,
          user.id,
          'IMAGE',
          'PROMOTED_EVENT',
          'EVENT',
        );
        if (error) {
          return error;
        }
        jsonDta['logoUrl'] = fileData!.fileUrl;
        attachment_id = fileData!.id;
      }
      if (body.logoUrl) {
        const response = await fetch(body.logoUrl);

        if (!response.ok) {
          throw new HttpException(`Failed to fetch image. Status: ${response.status}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const fileName = `${randomUUID() + new Date().toISOString()}.jpg`; // or any other logic to generate file name
        // const filePath = join(__dirname, '..', 'uploads', fileName);
        const mediaHost = this.configService.get('MEDIA_STORAGE_DOMAIN') ?? '';
        const dir = './public/temp/';
        const writer = fs.createWriteStream(dir + fileName);
        // response.body?.
        console.log();
        const picData = await response.arrayBuffer();
        if (picData !== undefined) {
          const buffer = Buffer.from(picData);
          await fs.promises.writeFile(dir + fileName, buffer);
          const filetype = 'IMAGE';
          const upload = await this.eventDataService.createAttachement({
            fileName: body.logoUrl,
            fileType: filetype,
            fileSize: 0,
            fileUrl: mediaHost + '/public/' + fileName,
            sourceModule: 'PROMOTED_EVENT',
            sourceId: 'EVENT',
            createdByUser: { connect: { id: user.id } },
          });
          attachment_id = upload.id;
          jsonDta['logoUrl'] = upload.fileUrl;
          attachment_id = upload.id;
          // return upload;
        }
      }
      const eventBody: object = {};
      if (body.approval) {
        eventBody['approval'] = body.approval === 'true' ? true : false;
      }
      if (body.capacity) {
        eventBody['capacity'] = parseInt(body.capacity, 10);
        jsonDta['maxCapacity'] = parseInt(body.capacity, 10);
      }
      if (body.registration) {
        eventBody['registration'] = body.registration === 'true' ? true : false;
      }
      if (body.waitlisting) {
        eventBody['waitlisting'] = body.waitlisting === 'true' ? true : false;
      }

      if (body.type && body.type.toUpperCase() === 'CHILD' && body.eventId) {
        eventBody['parentEventId'] = body.eventId;
      }
      // jsonDta['userInfo'] = user;
      const data = await this.eventDataService.createPromotedEvent({
        name: body.name,
        data: jsonDta,
        accountId: user.accountId,
        attachmentId: attachment_id,
        createdBy: user.id,
        type: body.type,
        ...eventBody,
      });
      if (data.data) {
        delete data.data['userInfo'];
      }
      this.createPoster(
        data.name,
        jsonDta['logoUrl'] as string,
        jsonDta.participationType ?? '',
        data.id,
      );
      return { data: { message: 'event added', data: data } };
    } catch (error) {
      console.error(error);
      return { error };
    }
  }
  async createPoster(
    name: string,
    imageUrl: string,
    participationType: string,
    eventId: string,
  ) {
    try {
      console.log(name, imageUrl, participationType, eventId);

      const data = await this.posterService.generateCustomPoster(
        name,
        imageUrl,
        participationType,
      );
      // console.log(data);
      const eventData = await this.eventDataService.findUniquePromotedEvent({
        id: eventId,
      });
      const objectBodyForEvent: object = { ...(eventData?.data as object) };
      objectBodyForEvent['posterLink'] = data;
      await this.eventDataService.updatePromotedEvent(
        {
          data: objectBodyForEvent,
        },
        eventId,
      );
      // console.log({ objectBodyForEvent });
    } catch (error) {
      console.error('' + error);
      return { error };
    }
  }
  escapeSqlString(value: string): string {
    return value.replace(/'/g, "''");
  }
  async getEvent(user: SelectedUserDetails, query: Query_Dto) {
    try {
      if (query.views === 'suggestion') {
        return await this.getEventSuggestion(query, user);
      }
      let where: string = '';
      if (query.id) {
        where += ` and e.id in ('${query.id.split("','")}') `;
      }
      if (query.name) {
        const redefine: string[] =
          this.escapeSqlString(query.name).split(',') || [];
        for (const data of redefine) {
          where += ` and lower(e.name) like '%${data.toLowerCase()}%'`;
        }
      }
      if (query.event_type) {
        where += ` and lower(e.data->>'event_type')
         in ('${query.event_type.toLowerCase().split(',').join("','")}') `;
      }
      if (query.participationType) {
        where += ` and lower(e.data->>'participationType') 
        in ('${query.participationType.toLowerCase().split(',').join("','")}') `;
      }
      if (
        !query.views &&
        !query.calendarType &&
        query.start_date &&
        query.end_date
      ) {
        where += ` and (e.data->>'start_date' >= '${new Date(query.start_date).toISOString()}' 
        or e.data->>'end_date' <= '${new Date(query.end_date).toISOString()})'  `;
      }
      if (query.upcoming) {
        where += ` AND (
    (e.data->>'start_date')::DATE >= CURRENT_DATE
    OR (
        CURRENT_DATE BETWEEN (e.data->>'start_date')::DATE 
                        AND (e.data->>'end_date')::DATE
    )
)`;
      }
      if (!query.sortBy && !query.sortType) {
        query.sortBy = ` "createdAt" `;
        query.sortType = ' desc ';
      } else {
        query.sortBy = ` e.data->>'${query.sortBy}' `;
      }
      if (query.expired) {
        where += ` and (e.data->>'end_date')::DATE < '${new Date(query.expired).toISOString()}' `;
      }
      if (
        query.views &&
        query.views === 'calendar' &&
        query.start_date &&
        query.end_date &&
        query.widgetId &&
        query.calendarType
      ) {
        return await this.eventDataService.calendarView(
          query.end_date,
          query.start_date,
          query.widgetId,
          query.calendarType,
          user.accountId,
          where,
        );
      }
      const [count, data] = await Promise.all([
        this.eventDataService.findCountOfPromotedEvents(user.accountId, where),
        this.eventDataService.findManyPromotedEvents(
          user.accountId,
          where,
          query.sortBy,
          query.sortType ?? 'asc',
          query.limit + '',
          query.offset + '',
        ),
      ]);
      // if (subEentId.length > 0) {
      //   where += ` and e.id not in ('${subEentId.map((val) => val.subEventId).join("','")}') `;
      // }
      const subEentId = await this.eventDataService.findManyChildPromotedEvent(
        data.map((val) => val.id),
        user.accountId,
      );
      // console.log('count', count[0].id, data, subEentId);
      const outData: any[] = [];
      for (const ids of data) {
        const subEventIdsFromdata: string[] = [];
        for (const sub of subEentId) {
          if (sub.parentEventId === ids.id) {
            subEventIdsFromdata.push(sub.id);
          }
        }

        // console.log('logs', subEventIdsFromdata);
        const { childSubEvent, iddWid, isLinked, widgetData } =
          await this.eventDataService.getLinkedEventData(
            query.widgetId,
            ids.id,
            subEventIdsFromdata,
          );
        const eventAllData: any = { ...ids };
        eventAllData['data']['customizationData'] = eventAllData['data'][
          'customizationData'
        ]
          ? JSON.parse(eventAllData['data']['customizationData'])
          : {};
        const datachildSubEventConvert: any = [];
        for (const child of childSubEvent) {
          const chileLinkedToWidget =
            await this.eventDataService.getCountForChildEventForWidget(
              query.widgetId,
              child.id,
            );
          const data: any = child.data;
          data['customizationData'] = data['customizationData']
            ? JSON.parse(data['customizationData'])
            : {};
          datachildSubEventConvert.push({
            ...child,
            data: data,
            isWidgetLinked:
              Number(chileLinkedToWidget[0].id) > 0 ? true : false,
          });
          // console.log({ datachildSubEventConvert })
        }
        const infinity: boolean =
          eventAllData.capacity === -1 && eventAllData.data.maxCapacity == -1;
        outData.push({
          ...eventAllData,
          infinity: infinity,
          widgetData: widgetData,
          children: datachildSubEventConvert,
          isWidgetLinked: Number(isLinked[0].id) > 0 ? true : false,
        });
      }
      // console.log('count', count);

      return { data: { totalCount: Number(count[0]?.id ?? 0), data: outData } };
    } catch (error) {
      console.log(error);
      console.error(error);
      return { error };
    }
  }

  async createEventSpeaker(
    body: EventSpeakerDto,
    file: File,
    user: SelectedUserDetails,
  ) {
    try {
      let attachment_id: string | null = null;
      if (file) {
        const fileName =
          randomUUID() +
          file.originalname.substring(file.originalname.lastIndexOf('.'));
        const { fileData, error } = await this.fileCreate.createFile(
          fileName,
          file,
          user.id,
          'IMAGE',
          body.isExhibitor && body.isExhibitor.length > 2 ? 'PROMOTED_EVENT_EXHIBITOR' : 'PROMOTED_EVENT_SPEAKER',
          'EVENT',
        );
        if (error) {
          return error;
        }
        attachment_id = fileData!.fileUrl;
      }
      const interest: object = { interest: 'SPEAKER' };
      if (body.isExhibitor) {
        interest['interest'] = 'EXHIBITOR';
      }
      // const participationType = await this.prisma.userInterest.create({
      //   data: {
      //     ...interest,
      //     entityId: body.eventId,
      //     source: 'eventgeni/widget/event',
      //     sorceId: body.eventId,
      //     userId: user.id,
      //     companyId: user.companyId,
      //     Note: body.data,
      //   },
      // });
      const eventdata = await this.eventDataService.findUniquePromotedEvent({
        id: body.eventId,
      });
      if (eventdata) {
        const data: any = eventdata?.data;
        console.log(
          { data: eventdata?.data ?? {} },
          { data22: eventdata?.data?.['customizationData'] },
        );

        let custData: any = JSON.parse(eventdata?.data?.['customizationData']);
        if (body.isExhibitor) {
          if (!custData['exhibitor']) {
            custData['exhibitor'] = [];
          }
          custData['exhibitor'].push({
            data: body.data,
            interest: 'EXHIBIT',
            imageUrl: attachment_id,
          });
          data['customizationData'] = JSON.stringify(custData);
        } else {
          if (!custData['speaker']) {
            custData['speaker'] = [];
          }
          custData['speaker'].push({
            data: body.data,
            interest: 'SPEAK',
            imageUrl: attachment_id,
          });
          data['customizationData'] = JSON.stringify(custData);
        }
        await this.eventDataService.updatePromotedEvent(
          { data: data },
          body.eventId,
        );
      }
      return {
        data: {
          [body.isExhibitor && body.isExhibitor.length > 2 ? 'exhibitor' : "speaker"]: {
            data: body.data,
            interest: body.isExhibitor && body.isExhibitor.length > 2 ? 'EXHIBIT' : 'SPEAK',
            imageUrl: attachment_id,
          },
        },
      };
    } catch (error) {
      console.log(error);
      console.error(error);
      return { error };
    }
  }
  async updateEvent(
    body: UpdateEventDto,
    file: File,
    user: SelectedUserDetails,
  ) {
    try {
      let postCallFlag: boolean = false;
      const eventDta = await this.eventDataService.getEventCreator(body.id);
      let attachment_id: string | null = null;
      let jsonDta = { data: {} };
      const eventBody: object = {};
      if (body.data) {
        jsonDta['data'] = JSON.parse(body.data);
        if (
          (eventDta?.data as any)['participationType'] !==
          jsonDta['data']['participationType']
        ) {
          postCallFlag = true;
        }
      }
      if (!body.data) {
        jsonDta['data'] = eventDta?.data as any;
        // initalmaxCapacity = jsonDta['data']['maxCapacity'];
      }
      if (body.maxCapacity) {
        let maxCapacity: number = parseInt(body.maxCapacity, 10);
        let initalmaxCapacity: number =
          ((eventDta?.data as any)['maxCapacity'] ?? 0) === -1
            ? 0
            : ((eventDta?.data as any)['maxCapacity'] ?? 0);
        jsonDta['data']['maxCapacity'] = maxCapacity;
        let currectCapacioty: number = eventDta?.capacity ?? 0;
        currectCapacioty =
          currectCapacioty < 0 ? currectCapacioty + 1 : currectCapacioty;
        if (maxCapacity !== -1) {
          eventBody['capacity'] =
            maxCapacity - initalmaxCapacity + currectCapacioty;
          // console.log(
          //   { maxCapacity },
          //   { initalmaxCapacity },
          //   {
          //     event: currectCapacioty,
          //   },
          //   {
          //     diff: maxCapacity - initalmaxCapacity + currectCapacioty,
          //   },
          // );
          // console.log(1, { eventBody });
        } else {
          // console.log(2, { eventBody });
          eventBody['capacity'] = -1;
        }
      }
      // console.log({ eventBody });

      if (file.buffer) {
        const fileName =
          randomUUID() +
          file.originalname.substring(file.originalname.lastIndexOf('.'));
        const { fileData, error } = await this.fileCreate.createFile(
          fileName,
          file,
          user.id,
          'IMAGE',
          'EVENT',
          'EVENT',
        );
        if (error) {
          return error;
        }
        jsonDta['data']['logoUrl'] = fileData!.fileUrl;
        jsonDta['atachmentId'] = fileData!.id;
        postCallFlag = true;
      }
      if (body.logoUrl) {
        const response = await fetch(body.logoUrl);

        if (!response.ok) {
          throw new HttpException(`Failed to fetch image. Status: ${response.status}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const fileName = `${randomUUID() + new Date().toISOString()}.jpg`; // or any other logic to generate file name
        // const filePath = join(__dirname, '..', 'uploads', fileName);
        const mediaHost = this.configService.get('MEDIA_STORAGE_DOMAIN') ?? '';
        const dir = './public/temp/';
        const writer = fs.createWriteStream(dir + fileName);
        // response.body?.
        console.log();
        const picData = await response.arrayBuffer();
        if (picData !== undefined) {
          const buffer = Buffer.from(picData);
          await fs.promises.writeFile(dir + fileName, buffer);
          const filetype = 'IMAGE';
          const upload = await this.eventDataService.createAttachement({
            fileName: body.logoUrl,
            fileType: filetype,
            fileUrl: mediaHost + '/public/' + fileName,
            fileSize: 0,
            sourceModule: 'EVENT',
            sourceId: 'EVENT',
            createdByUser: { connect: { id: user.id } },
          });
          jsonDta['data']['attachmentId'] = upload.id;
          jsonDta['data']['logoUrl'] = upload.fileUrl;
          // return upload;
          postCallFlag = true;
        }
      }
      if (body.name) {
        jsonDta['name'] = body.name;
        postCallFlag = true;
      }
      if (body.approval) {
        eventBody['approval'] = body.approval === 'true' ? true : false;
      }
      if (body.capacity) {
        eventBody['capacity'] = parseInt(body.capacity, 10);
      }
      if (body.registration) {
        eventBody['registration'] = body.registration === 'true' ? true : false;
      }
      if (body.waitlisting) {
        eventBody['waitlisting'] = body.waitlisting === 'true' ? true : false;
      }
      // jsonDta['data']['userInfo'] = user;
      console.log({ eventBody });

      const data = await this.eventDataService.updatePromotedEvent(
        { ...jsonDta, ...eventBody },
        body.id,
      );
      if (postCallFlag) {
        this.createPoster(
          data.name,
          (data.data as any)['logoUrl'],
          (data.data as any)['participationType'],
          data.id,
        );
      }
      // if (data.data) {
      //   delete data.data['userInfo'];
      // }
      return { data: { message: 'event updated', data: data } };
    } catch (error) {
      console.log(error);
      console.error(error);
      return { error };
    }
  }
  async getEventSuggestion(query: Query_Dto, user: SelectedUserDetails) {
    try {
      const proEvent: {
        id: string;
        name: string;
        data: Record<any, any>;
        isUsed?: boolean;
      }[] = [];
      const data = this.escapeSqlString(query.name?.toLowerCase() ?? '')
        .split(',')
        .map((val) => {
          return ` lower(name) like '${val}%' `;
        });
      const productDbEventCount =
        await this.eventDataService.findCountOfPromotedEvents(
          user.accountId,
          'and ' + data.join('and'),
        );
      const productDbEvent = await this.eventDataService.findManyPromotedEvents(
        user.accountId,
        'and ' + data.join('and'),
        query.sortBy ?? 'e.name',
        query.sortType ?? 'asc',
        query.limit + '',
        query.offset + '',
      );
      if (productDbEvent.length > 0 && query.widgetId) {
        console.log(
          'productDbEvent.map((val) => val.id)',
          productDbEvent.map((val) => val.id),
        );
        const widgetEvent =
          await this.eventDataService.getWidgetIdLinkedWithEvent(
            query.widgetId,
            productDbEvent.map((val) => val.id).join("','"),
          );
        for (const val of productDbEvent) {
          let temp: boolean = false;
          for (const ids of widgetEvent) {
            if (val.id === ids.id) {
              temp = true;
              break;
            }
          }
          proEvent.push({ ...val, isUsed: temp });
        }
      } else {
        proEvent.push(...productDbEvent);
      }
      const limitReaming = query.limit - productDbEvent.length;
      const microServiceEvent = await fetchDatafromMicroService('eventSuggestionsFetch', {
        max: limitReaming + '',
        eventName: query.name,
        widget: 'y',
        eventNameExcept: productDbEvent.map((val) => val.name).join(','),
      })

      // (await this.search(
      //   {
      // max: limitReaming + '',
      // eventName: query.name,
      // widget: 'y',
      // eventNameExcept: productDbEvent.map((val) => val.name).join(','),
      //   },
      //   '',
      // )) as { data: { events: any[]; count: number } };
      // console.log(
      //   'productDbEvent',
      //   productDbEvent,
      //   microServiceEvent?.data?.count ?? 0,
      //   Number(productDbEventCount[0].id),
      // );

      return {
        data: {
          totalEvents:
            (microServiceEvent?.data?.count ?? 0) +
            Number(productDbEventCount[0].id),
          events: [...proEvent, ...microServiceEvent.data.events],
        },
      };
    } catch (error) {
      console.log(error);
      console.error(error);
      return { error };
    }
  }
  async deletePromotedEvent(eventId: string, user: SelectedUserDetails) {
    try {
      const deletePromotedEvent =
        await this.eventDataService.updatePromotedEvent(
          {
            deleted: true,
          },
          eventId,
        );
      const jobPayLoad: any = {
        email: (
          await this.eventDataService.getUserRegisteredForPromotedEvent(
            '9c47b7cc-ff9d-4c36-ab4e-25b39966cb5e',// user.accountId,
            eventId,
          )
        ).map((interest) => interest.interestedUser.email),
        eventName: deletePromotedEvent.name,
        userId: user.id,
        userEmail: user.email,
        sourceId: eventId
      };
      this.eventDataService.createEventCancelJob(jobPayLoad, user.id);
      await this.eventDataService.deletePromotedEvent(eventId);
      return { data: { message: 'promoted-event deleted' } };
    } catch (error) {
      console.log(error);
      console.error(error);
      return { error };
    }
  }
}
