import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  QueryDto,
  CountQueryDto,
  EventsTrendsDto,
  PocsUnmaskDto,
  EventDataDto,
  Show,
} from './dto';
import {
  Export,
  Prisma,
  UnlockValue,
  UserActivitySource,
} from '@prisma/client';
import { microserviceEndpoints } from 'src/utils/endpoints';
import { ConfigService } from '@nestjs/config';
import { CreateExportDto } from 'src/exports/dto';
import { FastifyReply } from 'fastify';
import { get } from 'http';
import { TCachedUser } from 'src/utils/types';
import { LimitDto } from 'src/global_dto';
import { encrypt } from 'src/utils';
import { TrackerDataService } from 'src/tracker/tracker.data.service';

@Injectable()
export class EventsDataService {
  constructor(
    private readonly trackerDataService: TrackerDataService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}
  async createLogForEncryptedQuery(
    encryption: string,
    user: TCachedUser,
    requestSource: UserActivitySource,
  ) {
    const previousActivity = await this.prisma.userActivity.findFirst({
      where: {
        accountId: user.accountId,
        userId: user.id,
        path: '/events',
        source: requestSource,
        request: { equals: { data: encryption } },
      },
      select: {
        id: true,
      },
    });
    if (previousActivity) {
      await this.prisma.userActivity.update({
        where: { id: previousActivity.id },
        data: {
          updatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.userActivity.create({
        data: {
          path: '/events',
          request: { data: encryption },
          source: requestSource,
          account: { connect: { id: user.accountId } },
          user: { connect: { id: user.id } },
        },
      });
    }
  }
  async getEvents(params: QueryDto) {
    // params = {
    //   ...params,
    //   show: [...(params.show || []), 'newLocation' as Show],
    // };
    const queryParams = new URLSearchParams(
      params as unknown as Record<string, any>,
    );
    if (params.limit) {
      queryParams.append('take', String(params.limit));
    }
    if (params.offset) {
      queryParams.append('skip', String(params.offset));
    }
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.events +
      '?' +
      queryParams.toString() +
      '&showValues=basic,advance,insights,audience';
    console.log(url);
    const response = await fetch(url);
    const result = await response.json();
    if (result.statusCode) {
      throw result;
    }
    const { data, error } = result;
    if (error) {
      throw new HttpException(result, result.statusCode);
    }
    return data as {
      count?: number;
      // events: EventDataDto[];
      events: { basic: Record<string, any>; advance: Record<string, any> }[];
    };
  }

  async getEventsCount(params: CountQueryDto) {
    const queryParams = new URLSearchParams(
      params as unknown as Record<string, any>,
    );
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.count +
      '?' +
      queryParams.toString();
    console.log(url);
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (!data || error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data;
  }

  async getEventPocs(eventId: string, sortBy: string) {
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.eventPocs.replace(':eventId', eventId);
    const response = await fetch(url + `?sortBy=${sortBy}`);
    const { data, error } = await response.json();
    if (!data || error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    const reponseData: { eventPoCs: object[] } = { eventPoCs: [] };
    console.log(data, data.eventPoCs.length > 0);
    if (data.eventPoCs.length > 0) {
      for (const val of data.eventPoCs) {
        reponseData.eventPoCs.push({
          ...val,
          id: encrypt(val.id + process.env.TEN_TIMES_ID_ENCRYPT_KEY),
        });
        console.log('m');
      }
      console.log('l');
    }
    return reponseData;
  }

  async getEventEditions(eventId: string, query: LimitDto) {
    const queryParams = new URLSearchParams({
      take: query.limit.toString(),
      skip: query.offset.toString(),
    });
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.eventEditions.replace(':eventId', eventId) +
      '?' +
      queryParams.toString();
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (!data || error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data;
  }

  async getEventCoorganizers(eventId: string) {
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.eventCoorganizers.replace(
        ':eventId',
        eventId,
      );
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (!data || error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data;
  }

  async getEventRankings(eventId: string) {
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.eventRankings.replace(':eventId', eventId);
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (!data || error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data;
  }

  async getEventSpeakers(eventId: string, query: LimitDto) {
    const queryParams = new URLSearchParams({
      take: query.limit.toString(),
      skip: query.offset.toString(),
    });
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.eventSpeakers.replace(':eventId', eventId) +
      '?' +
      queryParams.toString();
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (!data || error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data;
  }

  async getEventSponsors(eventId: string, query: LimitDto) {
    const queryParams = new URLSearchParams({
      take: query.limit.toString(),
      skip: query.offset.toString(),
    });
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.eventSponsors.replace(':eventId', eventId) +
      '?' +
      queryParams.toString();
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (!data || error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data;
  }

  async getEventExhibitors(eventId: string, query: LimitDto) {
    const queryParams = new URLSearchParams({
      take: query.limit.toString(),
      skip: query.offset.toString(),
    });
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.eventExhibitors.replace(
        ':eventId',
        eventId,
      ) +
      '?' +
      queryParams.toString();
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (!data || error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data;
  }

  async getEventPolygons(eventId: string) {
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.eventPolygons.replace(':eventId', eventId);
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (!data || error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data;
  }
  async createTrackerPayloadForIntelScore(user: TCachedUser) {
    const [peopleCount, keywordCount, competitorCount] = await Promise.all([
      // this.trackerDataService.getTrackersCount(user, { limit: 10, offset: 0, type: 'trackers', subType: 'T_SPEAKING_OPPORTUNITY' }),
      this.trackerDataService.getTrackersCount(user, {
        limit: 10,
        offset: 0,
        type: 'trackers',
        subType: 'T_PEOPLE_FINDER',
      }),
      this.trackerDataService.getTrackersCount(user, {
        limit: 10,
        offset: 0,
        type: 'trackers',
        subType: 'T_PRODUCT_KEYWORDS',
      }),
      this.trackerDataService.getTrackersCount(user, {
        limit: 10,
        offset: 0,
        type: 'trackers',
        subType: 'T_COMPETITOR',
      }),
    ]);
    const [peopleAllTrackData, keywordAllTrackData, competitorAllTrackData] =
      await Promise.all([
        // this.trackerDataService.getTrackers({ limit: speakerCount, offset: 0, type: 'trackers', subType: 'T_SPEAKING_OPPORTUNITY' }, user),
        this.trackerDataService.getTrackers(
          {
            limit: peopleCount,
            offset: 0,
            type: 'trackers',
            subType: 'T_PEOPLE_FINDER',
          },
          user,
        ),
        this.trackerDataService.getTrackers(
          {
            limit: keywordCount,
            offset: 0,
            type: 'trackers',
            subType: 'T_PRODUCT_KEYWORDS',
          },
          user,
        ),
        this.trackerDataService.getTrackers(
          {
            limit: competitorCount,
            offset: 0,
            type: 'trackers',
            subType: 'T_COMPETITOR',
          },
          user,
        ),
      ]);
    const requestBody: {
      speakerBody?: { speakerNames: string; speakerCompanyName: string };
      peopleBody?: { peopleNames: string; peopleCompanyName: string };
      keywordBody?: { includeKeywords?: string; excludeKeywords?: string };
      competitorBody?: {
        competitorWebsiteNames?: string;
        competitorCompanyName?: string;
      };
    } = {};
    // if (speakerAllTrackData.length > 0) {
    //   requestBody.speakerBody = { speakerCompanyName: '', speakerNames: '' };
    //   speakerAllTrackData.forEach(tracker => {
    //     const filterValues: any = tracker.filterValues;
    //     requestBody.speakerBody!.speakerCompanyName += filterValues.userOrgWebsite;
    //     requestBody.speakerBody!.speakerNames += filterValues.userName;
    //   })
    // }
    if (peopleAllTrackData.length > 0) {
      requestBody.peopleBody = { peopleCompanyName: '', peopleNames: '' };
      peopleAllTrackData.forEach((tracker) => {
        const filterValues: any = tracker.filterValues;
        requestBody.peopleBody!.peopleCompanyName +=
          filterValues.userOrgWebsite;
        requestBody.peopleBody!.peopleNames += filterValues.userName;
      });
    }
    if (competitorAllTrackData.length > 0) {
      requestBody.competitorBody = {
        competitorCompanyName: '',
        competitorWebsiteNames: '',
      };
      competitorAllTrackData.forEach((tracker) => {
        const filterValues: any = tracker.filterValues;
        if (filterValues.orgName)
          requestBody.competitorBody!.competitorCompanyName +=
            filterValues.orgName;
        if (filterValues.orgWebsite)
          requestBody.competitorBody!.competitorWebsiteNames +=
            filterValues.orgWebsite;
      });
      if (requestBody.competitorBody.competitorCompanyName?.length === 0) {
        requestBody.competitorBody.competitorCompanyName = undefined;
      }
      if (requestBody.competitorBody.competitorWebsiteNames?.length === 0) {
        requestBody.competitorBody.competitorWebsiteNames = undefined;
      }
    }
    if (keywordAllTrackData.length > 0) {
      requestBody.keywordBody = { includeKeywords: '', excludeKeywords: '' };
      keywordAllTrackData.forEach((tracker) => {
        const filterValues: any = tracker.filterValues;
        if (filterValues.includeKeywords)
          requestBody.keywordBody!.includeKeywords +=
            filterValues.includeKeywords;
        if (filterValues.excludeKeywords)
          requestBody.keywordBody!.excludeKeywords +=
            filterValues.excludeKeywords;
      });
      if (requestBody.keywordBody.includeKeywords?.length === 0) {
        requestBody.keywordBody.includeKeywords = undefined;
      }
      if (requestBody.keywordBody.excludeKeywords?.length === 0) {
        requestBody.keywordBody.excludeKeywords = undefined;
      }
    }
    return requestBody;
  }
  async getEventIntelScore(eventId: string, user: TCachedUser) {
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.eventIntelScore.replace(':eventId', eventId);
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(await this.createTrackerPayloadForIntelScore(user)),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const { data, error } = await response.json();
    if (!data || error) {
      console.log({ data, error });
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data;
  }
  async getEventsTrends(params: EventsTrendsDto) {
    const queryParams = new URLSearchParams(
      params as unknown as Record<string, any>,
    );
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.trends +
      '?' +
      queryParams.toString();
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (!data || error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data;
  }

  async getAccountConfiguration(configurationId: string) {
    const configuration = await this.prisma.configuration.findUnique({
      where: { id: configurationId },
    });
    if (!configuration) {
      throw new HttpException('configuration not found', HttpStatus.NOT_FOUND);
    }
    return configuration.config;
  }
  async createEventExport(exportData: Export) {
    try {
      const url =
        this.configService.get('MICROSERVICE_URL') +
        microserviceEndpoints.events.createExport;

      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          filename: exportData.id,
          parameters: exportData.inputData,
          extension: exportData.exportFileType.toLowerCase(),
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { data, error } = await response.json();
      if (!data || error) {
        throw new HttpException(error, HttpStatus.BAD_REQUEST);
      }

      return data;
    } catch (error) {
      throw new HttpException(
        { filename: exportData.id },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getExport(filename: string, reply: FastifyReply) {
    const url = this.configService.get('MICROSERVICE_URL') + `/${filename}`;
    get(url, (externalRes) => {
      if (externalRes.statusCode !== 200) {
        return reply.status(500).send({
          error: new HttpException(
            'error while fetching the file',
            HttpStatus.INTERNAL_SERVER_ERROR,
          ),
        });
      }

      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return reply.send(externalRes);
    }).on('error', (error) => {
      console.error('Error fetching the file:', error);
      reply.status(500).send('Error fetching the file');
    });
  }
}
