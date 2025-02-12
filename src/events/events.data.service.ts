import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryDto, CountQueryDto, EventsTrendsDto, PocsUnmaskDto } from './dto';
import { Export, Prisma, UnlockValue } from '@prisma/client';
import { microserviceEndpoints } from 'src/utils/endpoints';
import { ConfigService } from '@nestjs/config';
import { CreateExportDto } from 'src/exports/dto';
import { FastifyReply } from 'fastify';
import { get } from 'http';
import { TCachedUser } from 'src/utils/types';
import { LimitDto } from 'src/global_dto';

@Injectable()
export class EventsDataService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}
  async createLogForEncryptedQuery(encryption: string, user: TCachedUser) {
    const previousActivity = await this.prisma.userActivity.findFirst({
      where: {
        accountId: user.accountId,
        userId: user.id,
        path: '/events',
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
          account: { connect: { id: user.accountId } },
          user: { connect: { id: user.id } },
        },
      });
    }
  }
  async getEvents(params: QueryDto) {
    // params = { ...params, show: [...(params.show || []), 'newLocation'] };
    const queryParams = new URLSearchParams(
      params as unknown as Record<string, any>,
    );
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.events +
      '?' +
      queryParams.toString();
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (!data || error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data;
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
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (!data || error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data;
  }

  async getEventPocs(eventId: string) {
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.eventPocs.replace(':eventId', eventId);
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (!data || error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data;
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
  async getUserPocLimitAndPocunloackedValues(
    eventId: string,
    pocId: string,
    query: PocsUnmaskDto,
    user: TCachedUser,
  ) {
    const [checkForEntry, limitForPoc] = await Promise.all([
      this.prisma.unlockedTransaction.findMany({
        where: {
          accountId: user.accountId,
          eventId: eventId,
          unlockValue: { in: query.unlockValue },
          unlockByUserId: pocId,
        },
      }),
      this.prisma.account.findFirst({
        where: {
          id: user.accountId,
        },
      }),
    ]);
    return { checkForEntry, limitForPoc };
  }
  async createUnlocakedPocEntryAndDeductPocLimitPoint(
    eventId: string,
    pocId: string,
    unlockValue: UnlockValue,
    user: TCachedUser,
    limit: number,
  ) {
    await this.prisma.unlockedTransaction.create({
      data: {
        accountId: user.accountId,
        eventId: eventId,
        unlockValue: unlockValue,
        unlockByUserId: pocId,
        source: 'CONTACT_DETAIL',
        unlockedById: user.id,
        unlockType: 'USER',
      },
    });
    // }
    await this.prisma.account.update({
      where: {
        id: user.accountId,
      },
      data: {
        pendingPocUnlockRequests: limit,
      },
    });
    return { message: 'Poc unlocked successfully' };
  }
  async updateEventPocunlocakedEntry(unlocakedEntryId: string, userId: string) {
    await this.prisma.unlockedTransaction.update({
      where: {
        id: unlocakedEntryId,
      },
      data: {
        unlockedById: userId,
      },
    });
    return { message: 'Poc unlocked entry updated successfully' };
  }
  async getEventsPocsunloacked(pocId: string, params: UnlockValue[]) {
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.eventPocsUnlocked +
      '?' +
      `unlockValue=${params.join(',').toLowerCase()}&pocId=${pocId}`;
    const response = await fetch(url);
    const { data, error } = await response.json();
    console.log(url, error, data);

    if (!data || error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data;
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
