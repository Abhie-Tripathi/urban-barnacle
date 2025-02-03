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
} from './dto';
import {
  CompanyDto,
  CompanyResponseDto,
  CompanyResponseSchema,
} from './dto/company.dto';
import { TagDto, TagResponseDto, TagResponseSchema } from './dto/tags.dto';
import { getNonEmptyParams } from 'src/utils';

@Injectable()
export class SuggestionDataService {
  constructor(private readonly configService: ConfigService) {}

  async getLocations(dto: LocationDto): Promise<LocationResponseDto> {
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
  }

  async getEventTypes(dto: EventTypeDto): Promise<EventTypeResponseDto[]> {
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
  }

  async getCategories(dto: CategoryDto): Promise<CategoryResponseDto[]> {
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
      microserviceEndpoints.suggestions.categories +
      '?' +
      searchQuery.toString();
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data.map((category: any) => CategoryResponseSchema.parse(category));
  }

  async getDesignations(dto: CategoryDto): Promise<CategoryResponseDto[]> {
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
      microserviceEndpoints.suggestions.designations +
      '?' +
      searchQuery.toString();
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data.map((designation: any) =>
      CategoryResponseSchema.parse(designation),
    );
  }

  async getCompanies(dto: CompanyDto): Promise<CompanyResponseDto[]> {
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
    return data.company.map((company: any) =>
      CompanyResponseSchema.parse(company),
    );
  }

  async getTags(dto: TagDto): Promise<TagResponseDto[]> {
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
  }
}
