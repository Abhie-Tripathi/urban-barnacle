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
import { TCachedUser } from 'src/shared/types';
import { File } from '@nest-lab/fastify-multer';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { Interest, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PosterService } from './poster.service';
import { FileCreationService } from 'src/shared/file-creation.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
@Injectable()
export class EventService {
  constructor(
    private readonly prisma: PrismaService,
    private configService: ConfigService,
    private readonly posterService: PosterService,
    private readonly fileCreate: FileCreationService,
    @InjectQueue('eventProcessor') private readonly eventCanelQueue: Queue,
  ) {}

  async geniEventById(id: string) {
    try {
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
      return {
        error: new HttpException(
          'something went wrong',
          HttpStatus.BAD_REQUEST,
        ),
      };
    }
  }
  async getEventById(id: string, query) {
    try {
      if (query.source === 'eventgeni') {
        return await this.geniEventById(id);
      }
      const baseURL = this.configService.get('MICROSERVICE_URL') || '';
      const endpoint = '/event';
      const queryString = new URLSearchParams(query).toString();
      const url = `${baseURL}${endpoint}/${id}?${queryString}`;
      try {
        const response = await fetch(url, {
          method: 'GET',
        });

        // if (!response.ok) {
        //   throw new Error(`Error fetching categories: ${response.statusText}`);
        // }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching categories:', error);
        // throw error;
      }
    } catch (error: any) {
      return {
        error: new HttpException(
          'something went wrong',
          HttpStatus.BAD_REQUEST,
        ),
      };
    }
  }

  encrypt(text: string): string {
    const algorithm = 'aes-256-cbc';
    const secretKey = crypto
      .createHash('sha256')
      .update(String('your-secret-key'))
      .digest('base64')
      .substr(0, 32);
    const staticIv = crypto
      .createHash('sha256')
      .update(String('your-fixed-iv'))
      .digest()
      .slice(0, 16);
    const cipher = crypto.createCipheriv(algorithm, secretKey, staticIv);
    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-cbc';
    const secretKey = crypto
      .createHash('sha256')
      .update(String('your-secret-key'))
      .digest('base64')
      .substr(0, 32);
    const staticIv = crypto
      .createHash('sha256')
      .update(String('your-fixed-iv'))
      .digest()
      .slice(0, 16);
    const decipher = crypto.createDecipheriv(algorithm, secretKey, staticIv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  }

  async createEvent(body: CreateEventDto, file: File, user: TCachedUser) {
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
          'EVENT',
          'EVENT',
        );
        if (error) {
          return error;
        }
        jsonDta['logoUrl'] = fileData.fileUrl;
        attachment_id = fileData.id;
      }
      if (body.logoUrl) {
        const response = await fetch(body.logoUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch image. Status: ${response.status}`);
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
          const upload = await this.prisma.attachment.create({
            data: {
              fileName: body.logoUrl,
              fileType: filetype,
              fileSize: 0,
              fileUrl: mediaHost + '/public/' + fileName,
              sourceModule: 'EVENT',
              sourceId: 'EVENT',
              createdByUser: { connect: { id: user.id } },
            },
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
              fileType: true,
            },
          });
          attachment_id = upload.id;
          jsonDta['logoUrl'] = upload.fileUrl;
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

      if (body.type && body.type.toUpperCase() === 'SUB' && body.eventId) {
        eventBody['parentEventId'] = body.eventId;
      }
      // jsonDta['userInfo'] = user;
      const data = await this.prisma.event.create({
        data: {
          name: body.name,
          data: jsonDta,
          accountId: user.accountId,
          attachmentId: attachment_id,
          createdBy: user.id,
          ...eventBody,
        },
        select: {
          id: true,
          name: true,
          data: true,
        },
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
      return {
        error: new HttpException(
          'Internal Server down',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
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
      const eventData = await this.prisma.event.findFirst({
        where: {
          id: eventId,
        },
        select: {
          data: true,
        },
      });
      const objectBodyForEvent: object = { ...(eventData?.data as object) };
      objectBodyForEvent['posterLink'] = data;
      await this.prisma.event.update({
        where: {
          id: eventId,
        },
        data: {
          data: objectBodyForEvent,
        },
      });
      // console.log({ objectBodyForEvent });
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
  escapeSqlString(value: string): string {
    return value.replace(/'/g, "''");
  }
  async getEvent(user: TCachedUser, query: Query_Dto) {
    try {
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
        where += ` and e.data->>'start_date' >= '${new Date(query.start_date).toISOString()}' 
        and e.data->>'end_date' <= '${new Date(query.end_date).toISOString()}'  `;
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
        return await this.calendarView(
          query.end_date,
          query.start_date,
          query.widgetId,
          query.calendarType,
          user.accountId,
          where,
        );
      }
      const count = (await this.prisma.$queryRaw(
        Prisma.raw(` SELECT count(distinct e.id) as id
            FROM "Event" e where e.deleted = false and e."accountId" = '${user.accountId}' ${where} ;`),
      )) as { id: number }[];
      // if (subEentId.length > 0) {
      //   where += ` and e.id not in ('${subEentId.map((val) => val.subEventId).join("','")}') `;
      // }
      const data = (await this.prisma.$queryRaw(
        Prisma.raw(
          `
          SELECT e.id, e.name, e.data,e.approval, e.capacity, e.registration, e.waitlisting,e."createdAt" 
           FROM "Event" e
        where e.deleted = false  and (e."parentEventId" is null OR e."parentEventId"::TEXT ='')
    and e."accountId" = '${user.accountId}'
      ${where}
      order by ${query.sortBy}  ${query.sortType}
      limit ${query.limit}  offset ${query.offset};`,
        ),
      )) as {
        id: string;
        name: string;
        data: Record<any, any>;
        createdAt: Date;
      }[];
      const subEentId = await this.prisma.event.findMany({
        where: {
          accountId: user.accountId,
          deleted: false,
          parentEventId: { in: data.map((val) => val.id) },
        },
        select: {
          id: true,
          parentEventId: true,
        },
      });
      // console.log('count',count[0].id, data, subEentId);
      const outData: any[] = [];
      for (const ids of data) {
        const subEventIdsFromdata: string[] = [];
        for (const sub of subEentId) {
          if (sub.parentEventId === ids.id) {
            subEventIdsFromdata.push(sub.id);
          }
        }

        console.log('logs', subEventIdsFromdata);
        const [iddWid, isLinked, childSubEvent] = await Promise.all([
          this.prisma.$queryRaw<{ id: string }[]>(
            Prisma.raw(`
              SELECT "B" as id
              FROM "_EventToWidget"
              WHERE "A" = '${ids.id}';
            `),
          ),
          this.prisma.$queryRaw<{ id: number }[]>(
            Prisma.raw(`
              SELECT count("A") as id
              FROM "_EventToWidget"
              WHERE 
                ${query.widgetId ? `"B" = '${query.widgetId}'` : `"B"::TEXT = ''`}
                AND "A" = '${ids.id}';
            `),
          ),
          this.prisma.event.findMany({
            where: {
              id: { in: subEventIdsFromdata },
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
        const eventAllData: any = { ...ids };
        eventAllData['data']['customizationData'] = eventAllData['data'][
          'customizationData'
        ]
          ? JSON.parse(eventAllData['data']['customizationData'])
          : {};
        const datachildSubEventConvert: any = [];
        for (const child of childSubEvent) {
          const chileLinkedToWidget = await this.prisma.$queryRaw<
            { id: number }[]
          >(
            Prisma.raw(`
  SELECT count("A") as id
  FROM "_EventToWidget"
  WHERE ${query.widgetId ? `"B" = '${query.widgetId}'` : `"B"::TEXT = ''`}
   and "A"= '${child.id}';
`),
          );
          const data: any = child.data;
          data['customizationData'] = data['customizationData']
            ? JSON.parse(data['customizationData'])
            : {};
          datachildSubEventConvert.push({
            ...child,
            data: data,
            type: 'SUB',
            isWidgetLinked:
              Number(chileLinkedToWidget[0].id) > 0 ? true : false,
          });
        }
        const infinity: boolean =
          eventAllData.capacity === -1 && eventAllData.data.maxCapacity == -1;
        outData.push({
          ...eventAllData,
          infinity: infinity,
          widgetData: widgetData,
          type: 'MAIN',
          children: datachildSubEventConvert,
          isWidgetLinked: Number(isLinked[0].id) > 0 ? true : false,
        });
      }
      return { totalCount: Number(count[0].id), data: outData };
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
  async createEventSpeaker(
    body: EventSpeakerDto,
    file: File,
    user: TCachedUser,
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
          'EVENT',
          'EVENT',
        );
        if (error) {
          return error;
        }
        attachment_id = fileData.fileUrl;
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
      const eventdata = await this.prisma.event.findFirst({
        where: {
          id: body.eventId,
        },
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
          // custData['exhibitor'].push({
          //   data: JSON.parse(participationType.Note ?? ''),
          //   interest: participationType.interest,
          //   imageUrl: sttt_id,
          // });
          data['customizationData'] = JSON.stringify(custData);
        } else {
          if (!custData['speaker']) {
            custData['speaker'] = [];
          }
          // custData['speaker'].push({
          //   data: JSON.parse(participationType.Note ?? ''),
          //   interest: participationType.interest,
          //   imageUrl: sttt_id,
          // });
          data['customizationData'] = JSON.stringify(custData);
        }
        await this.prisma.event.update({
          where: { id: body.eventId },
          data: { data: data },
        });
      }
      // return {
      //   data: {
      //     speaker: {
      //       data: JSON.parse(participationType.Note ?? ''),
      //       interest: participationType.interest,
      //       imageUrl: attachment_id,
      //     },
      //   },
      // };
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
  async updateEvent(body: UpdateEventDto, file: File, user: TCachedUser) {
    try {
      let postCallFlag: boolean = false;
      const eventDta = await this.prisma.event.findFirst({
        where: {
          id: body.id,
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
        jsonDta['data']['logoUrl'] = fileData.fileUrl;
        jsonDta['atachmentId'] = fileData.id;
        postCallFlag = true;
      }
      if (body.logoUrl) {
        const response = await fetch(body.logoUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch image. Status: ${response.status}`);
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
          const upload = await this.prisma.attachment.create({
            data: {
              fileName: body.logoUrl,
              fileType: filetype,
              fileUrl: mediaHost + '/public/' + fileName,
              fileSize: 0,
              sourceModule: 'EVENT',
              sourceId: 'EVENT',
              createdByUser: { connect: { id: user.id } },
            },
            select: {
              id: true,
              fileName: true,
              fileUrl: true,
              fileType: true,
            },
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
      if (body.deleted) {
        jsonDta['deleted'] = body.deleted === 'true' ? true : false;
        if (jsonDta['deleted'] === true) {
          //   const check = await this.prisma.userInterest.findMany({
          //     where: {
          //       entityId: body.id,
          //       source: 'eventgeni',
          //       entityType: 'INTEND',
          //       type: 'EXTERNAL',
          //       status: 'CONFIRMED',
          //       sorceId: body.sourceId ?? 'widget',
          //     },
          //     select: {
          //       user: {
          //         select: {
          //           email: true,
          //         },
          //       },
          //     },
          //   });
          //   this.cancelEventEmail(
          //     check.map((val) => val.user.email),
          //     eventDta,
          //   );
          //       email: string[];
          // eventName: any;
          // userId: string;
          // userEmail: string;
          // jobRequestId: string;
          const jobPayLoad: any = {
            email: [],
            eventName: eventDta.name,
            userId: user.id,
            userEmail: user.email,
          };
          const jobRequest = await this.prisma.requestedJob.create({
            data: {
              inputData: jobPayLoad,
              status: 'PENDING',
              source: 'EVENT_CANCEl',
              user: { connect: { id: user.id } },
            },
          });
          jobPayLoad['jobRequestId'] = jobRequest.id;
          await this.eventCanelQueue.add('eventCancelMail', jobPayLoad, {
            priority: 3,
          });
        }
      }
      if (jsonDta['published'] && jsonDta['published'] === false) {
        const wigId = (await this.prisma.$queryRaw(
          Prisma.raw(
            `select "B" as id FROM "_EventToWidget"
WHERE "A" = '${body.id}';
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
  WHERE a."A" = '${body.id}';
   
            `,
            ),
          );
          console.log('delete', deleteEvent);
          for (const dataOF of data?.event ?? []) {
            if (dataOF.id !== body.id) {
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

      const data = await this.prisma.event.update({
        where: {
          id: body.id,
        },
        data: {
          ...jsonDta,
          ...eventBody,
        },
        select: {
          id: true,
          name: true,
          data: true,
          registration: true,
        },
      });
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
      return {
        error: new HttpException(
          'Internal Server down',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
    }
  }
  async getEventSuggestion(query: Query_Dto, user: TCachedUser) {
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
      const productDbEventCount = (await this.prisma.$queryRaw(
        Prisma.raw(`
      select count(id) as id from 
      "Event"
 where
     ${data.join('and')} And deleted = false 
     ;
       `),
      )) as { id: number }[];
      const productDbEvent = (await this.prisma.$queryRaw(
        Prisma.raw(`
     select id, name, data from 
     "Event"
where
     ${data.join('and')}  And deleted = false 
   limit ${query.limit} offset ${query.offset}
    ;
      `),
      )) as { id: string; name: string; data: Record<any, any> }[];
      if (productDbEvent.length > 0 && query.widgetId) {
        console.log(
          'productDbEvent.map((val) => val.id)',
          productDbEvent.map((val) => val.id),
        );

        const widgetEvent = (await this.prisma.$queryRaw(
          Prisma.raw(`
       SELECT "A" as id from
       "_EventToWidget"
  where
       "B" = '${query.widgetId}'
    AND "A" IN ('${productDbEvent.map((val) => val.id).join("','")}');
      ;
        `),
        )) as { id: string }[];
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
      // const microServiceEvent = (await this.search(
      //   {
      //     max: limitReaming + '',
      //     eventName: query.name,
      //     widget: 'y',
      //     eventNameExcept: productDbEvent.map((val) => val.name).join(','),
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
            // (microServiceEvent?.data?.count ?? 0) +
            Number(productDbEventCount[0].id),
          events: [...proEvent], //...microServiceEvent.data.events],
        },
      };
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

  async cancelEventEmail(email: string[], event: any) {
    try {
      // event.User.email
      const data = {
        to: email,
        from: 'no-reply@eventgeni.com',
        html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        color: #333;
        margin: 0;
        padding: 0;
      }

      .email-container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }

      .logo {
        text-align: center;
        margin-bottom: 20px;
      }

      .logo img {
        display: inline-block;
        max-width: 50px;
        height: auto;
        vertical-align: middle;
        margin-right: 10px;
      }

      .logo .brand {
        display: inline-block;
        font-size: 24px;
        font-weight: bold;
        color: #333;
      }

      .content {
        font-size: 16px;
        line-height: 1.5;
      }

      .footer {
        font-size: 12px;
        color: #999;
        text-align: center;
        margin-top: 20px;
        border-top: 1px solid #ddd;
        padding-top: 10px;
      }

      .footer a {
        color: #007bff;
        text-decoration: none;
      }
    </style>
  </head>

  <body>
    <div class="email-container">
      <div class="logo">
        <img
          src="https://${this.configService.get('FRONTEND_URL')}/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcroppedlogo.c3b754be.png&w=48&q=75"
          alt="Whr.ai"
        />
        <span class="brand">Whr.ai</span>
      </div>

      <!-- Email Content -->
      <div class="content">
        <p>Hello there,</p>
        <p>
          We want to let you know that the host of
          <strong>${event.name}</strong> has canceled the event.
        </p>
        <p>See you next time!</p>
      </div>
      <div class="footer">
        <p><a href="#">Unsubscribe</a> from this list at any time.</p>
        <p>Manage Email Preferences</p>
        <p>Copyright © 10Times</p>
      </div>
    </div>
  </body>
</html>
`,
        subject: `Event Canceled: ${event.name}`,
      };
      const adminMail = {
        to: event.User.email,
        from: 'no-reply@eventgeni.com',
        html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Event Canceled</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        color: #333;
        margin: 0;
        padding: 0;
      }

      .email-container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }
      .header {
        display: inline-block;
        width: 100%;
        text-align: left;
        margin-bottom: 20px;
      }
      .header img {
        vertical-align: middle;
        max-width: 30px;
        margin-right: 10px;
      }
      .header h3 {
        display: inline;
        vertical-align: middle;
        font-size: 18px;
        font-weight: normal;
        color: #333;
      }

      .content {
        font-size: 16px;
        line-height: 1.5;
      }
      .content h1 {
        font-size: 24px;
        margin-bottom: 10px;
        color: #333;
      }
      .content p {
        font-size: 16px;
        margin-bottom: 10px;
        color: #333;
      }
      .reply-text {
        font-size: 14px;
        color: #666;
        padding-left: 20px; /* To indent like a reply */
        margin-top: 20px;
        border-left: 2px solid #ddd; /* Adds a line to the left like a reply message */
      }

      .footer {
        font-size: 12px;
        color: #999;
        text-align: center;
        margin-top: 20px;
        border-top: 1px solid #ddd;
        padding-top: 10px;
      }

      .footer a {
        color: #007bff;
        text-decoration: none;
      }
      .logo {
        text-align: center;
        margin-bottom: 20px;
      }
      .logo img {
        display: inline-block;
        max-width: 50px;
        height: auto;
        vertical-align: middle;
        margin-right: 10px;
      }

      .logo .brand {
        display: inline-block;
        font-size: 24px;
        font-weight: bold;
        color: #333;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <!-- Header section with logo and name -->
      <div class="logo">
        <img
          src="https://${this.configService.get('FRONTEND_URL')}/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcroppedlogo.c3b754be.png&w=48&q=75"
          alt="Whr.ai"
        />
        <span class="brand">Whr.ai</span>
      </div>

      <!-- Main content section -->
      <div class="content">
        <h1>${event.name} was Canceled</h1>
        <p>
         ${event.name} has been canceled. We have notified guests with the
          following email:
        </p>

        <!-- Reply-like text -->
        <div class="reply-text">
          <p>Hello there,</p>
          <p>
            We want to let you know that the host of ${event.name} has canceled
            the event.
          </p>
          <p>See you next time!</p>
        </div>
      </div>

      <!-- Footer section -->
      <div class="footer">
        <p><a href="#">Unsubscribe</a> from this list at any time.</p>
        <p>Manage Email Preferences</p>
        <p>Copyright © 10Times</p>
      </div>
    </div>
  </body>
</html>
`,
        subject: `Event Canceled: ${event.name}`,
      };
      // await Promise.all([sgMail.send(adminMail), sgMail.sendMultiple(data)]);
    } catch (error) {
      console.log(error);

      return {
        error: new HttpException(
          'something went wrong',
          HttpStatus.BAD_REQUEST,
        ),
      };
    }
  }
}
