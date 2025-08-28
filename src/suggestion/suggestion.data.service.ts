import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
// import { PrismaService } from 'src/prisma/prisma.service';
import { SharedService } from 'src/shared/shared.service';
import { ConfigService } from '@nestjs/config';
import { microserviceEndpoints } from 'src/utils/endpoints';
import {
  LocationDto,
  EventTypeDto,
  CategoryDto,
  SuggestionDto,
  CategoryResponseDto,
  CategoryResponseSchema,
  EventTypeResponseSchema,
  EventTypeResponseDto,
  LocationResponseDto,
  LocationResponseSchema,
  LocationType,
  TrackerDto,
} from './dto';
import {
  CompanyDto,
  CompanyResponseDto,
  CompanyResponseSchema,
} from './dto/company.dto';
import { TagDto, TagResponseDto, TagResponseSchema } from './dto/tags.dto';
import { encrypt, getNonEmptyParams } from 'src/utils';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SuggestionDataService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) { }

  async getLocations(dto: LocationDto): Promise<LocationResponseDto> {
    try {
      let params = {};
      if (dto.type === 'REGION') {
        params = {
          query: dto.query,
          offset: dto.offset,
          take: dto.limit,
        };
      } else {
        params = {
          locationType: dto.type,
          locationIds: dto.ids,
          take: dto.limit,
          skip: dto.offset,
          query: dto.query,
        };
      }

      const nonEmptyParams = getNonEmptyParams(params);
      const searchQuery = new URLSearchParams(
        nonEmptyParams as unknown as Record<string, any>,
      );

      const url =
        this.configService.get('MICROSERVICE_URL') +
        (dto.type === 'REGION'
          ? microserviceEndpoints.suggestions.regions
          : microserviceEndpoints.suggestions.locations) +
        '?' +
        searchQuery.toString();
      const response = await fetch(url);
      const { data, error } = await response.json();
      if (error) {
        throw new HttpException(error, HttpStatus.BAD_REQUEST);
      }
      if (dto.type === 'REGION') {
        return data;
      }
      return LocationResponseSchema.parse(data);
    } catch (error) {
      throw new HttpException('Invalid locations', HttpStatus.BAD_REQUEST);
    }
  }

  async getEventTypes(dto: EventTypeDto): Promise<EventTypeResponseDto[]> {
    try {
      const params = {
        eventTypeGroup: dto.type,
        ids: dto.ids,
        take: dto.limit,
        skip: dto.offset,
        query: dto.query,
        slugs: dto.slugs,
      };
      const nonEmptyParams = getNonEmptyParams(params);
      const searchQuery = new URLSearchParams(
        nonEmptyParams as unknown as Record<string, any>,
      );
      const url =
        this.configService.get('MICROSERVICE_URL') +
        microserviceEndpoints.suggestions.eventTypes +
        '?' +
        searchQuery.toString();
      const response = await fetch(url);
      const { data, error } = await response.json();
      if (!data || error) {
        throw new HttpException(error, HttpStatus.BAD_REQUEST);
      }
      return data.map((eventType: any) =>
        EventTypeResponseSchema.parse(eventType),
      );
    } catch (error) {
      throw new HttpException('Invalid event types', HttpStatus.BAD_REQUEST);
    }
  }

  async getCategories(dto: CategoryDto): Promise<CategoryResponseDto[]> {
    try {
      const params = {
        id: dto.ids,
        take: dto.limit,
        skip: dto.offset,
        name: dto.query,
        slugs: dto.slugs,
      };
      const nonEmptyParams = getNonEmptyParams(params);
      const searchQuery = new URLSearchParams(
        nonEmptyParams as unknown as Record<string, any>,
      );
      const url =
        this.configService.get('MICROSERVICE_URL') +
        microserviceEndpoints.suggestions.categories +
        '?' +
        searchQuery.toString();
      const response = await fetch(url);
      const { data, error } = await response.json();
      if (error) {
        throw new HttpException(error, HttpStatus.BAD_REQUEST);
      }
      return data.map((category: any) =>
        CategoryResponseSchema.parse(category),
      );
    } catch (error) {
      throw new HttpException('Invalid categories', HttpStatus.BAD_REQUEST);
    }
  }

  async getDesignations(dto: CategoryDto): Promise<CategoryResponseDto[]> {
    try {
      const params = {
        ids: dto.ids,
        take: dto.limit,
        skip: dto.offset,
        name: dto.query,
        slugs: dto.slugs,
        isDepartment: dto.isDepartment,
        isRole: dto.isRole,
        isDesignation: dto.isDesignation,
      };
      const nonEmptyParams = getNonEmptyParams(params);
      const searchQuery = new URLSearchParams(
        nonEmptyParams as unknown as Record<string, any>,
      );
      const url =
        this.configService.get('MICROSERVICE_URL') +
        microserviceEndpoints.suggestions.designations +
        '?' +
        searchQuery.toString();
      console.log(url);
      const response = await fetch(url);
      const { data, error } = await response.json();
      if (error) {
        throw new HttpException(error, HttpStatus.BAD_REQUEST);
      }
      if (dto.isDepartment || dto.isRole || dto.isDesignation) {
        // console.log("datadatadatadata", data);

        return data;
      }
      return data.map((designation: any) =>
        CategoryResponseSchema.parse(designation),
      );
    } catch (error) {
      throw new HttpException('Invalid designations', HttpStatus.BAD_REQUEST);
    }
  }

  async getCompanies(dto: CompanyDto): Promise<CompanyResponseDto[]> {
    try {
      const params = {
        q: dto.query,
      };
      const nonEmptyParams = getNonEmptyParams(params);
      const searchQuery = new URLSearchParams(
        nonEmptyParams as unknown as Record<string, any>,
      );
      const url =
        this.configService.get('MICROSERVICE_URL') +
        microserviceEndpoints.suggestions.companies +
        '?' +
        searchQuery.toString();
      const response = await fetch(url);
      const { data, error } = await response.json();
      if (!data || error) {
        throw new HttpException(error, HttpStatus.BAD_REQUEST);
      }
      return data.company
        .map((company: any) => {
          if (!company.id) {
            return null;
          }
          return {
            ...CompanyResponseSchema.parse(company), id: encrypt(
              (company.id + process.env.TEN_TIMES_ID_ENCRYPT_KEY) as string,
            ),
          };
        })
        .filter((company) => company !== null);
    } catch (error) {
      throw new HttpException('Invalid companies', HttpStatus.BAD_REQUEST);
    }
  }

  async getTags(dto: TagDto): Promise<TagResponseDto[]> {
    try {
      const params = {
        ids: dto.ids,
        take: dto.limit,
        skip: dto.offset,
        query: dto.query,
        slugs: dto.slugs,
      };
      const nonEmptyParams = getNonEmptyParams(params);
      const searchQuery = new URLSearchParams(
        nonEmptyParams as unknown as Record<string, any>,
      );
      const url =
        this.configService.get('MICROSERVICE_URL') +
        microserviceEndpoints.suggestions.tags +
        '?' +
        searchQuery.toString();
      const response = await fetch(url);
      const { data, error } = await response.json();
      if (error) {
        throw new HttpException(error, HttpStatus.BAD_REQUEST);
      }
      return data.map((tag: any) => TagResponseSchema.parse(tag));
    } catch (error) {
      throw new HttpException('Invalid tags', HttpStatus.BAD_REQUEST);
    }
  }
  async getTrackerName(dto: TrackerDto) {
    const trackerName = await this.prisma.tracker.findMany({
      where: {
        name: { contains: dto.query, mode: 'insensitive' },
      },
      select: {
        name: true,
        id: true,
      },
    });
    return trackerName;
  }
}
