import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryDto, CountQueryDto, EventsTrendsDto } from './dto';
import { Export, Prisma } from '@prisma/client';
import { microserviceEndpoints } from 'src/utils/endpoints';
import { ConfigService } from '@nestjs/config';
import { CreateExportDto } from 'src/exports/dto';
import { FastifyReply } from 'fastify';
import { get } from 'http';

@Injectable()
export class EventsDataService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async getEvents(params: QueryDto) {
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

  async getEventEditions(eventId: string) {
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.eventEditions.replace(':eventId', eventId);
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

  async getEventSpeakers(eventId: string) {
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.eventSpeakers.replace(':eventId', eventId);
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (!data || error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data;
  }

  async getEventSponsors(eventId: string) {
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.eventSponsors.replace(':eventId', eventId);
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (!data || error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data;
  }

  async getEventExhibitors(eventId: string) {
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.events.eventExhibitors.replace(':eventId', eventId);
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
