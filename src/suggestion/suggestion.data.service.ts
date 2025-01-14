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
} from './dto';
import {
  CompanyDto,
  CompanyResponseDto,
  CompanyResponseSchema,
} from './dto/company.dto';
import { TagDto, TagResponseDto, TagResponseSchema } from './dto/tags.dto';

@Injectable()
export class SuggestionDataService {
  constructor(
    // private readonly prisma: PrismaService,
    private readonly sharedService: SharedService,
    private readonly configService: ConfigService,
  ) {}

  async getLocations(dto: LocationDto): Promise<LocationResponseDto> {
    const params = {
      locationType: dto.type,
      ids: dto.ids,
      limit: dto.limit,
      offset: dto.offset,
      query: dto.query,
    };
    const nonEmptyParams = this.sharedService.getNonEmptyParams(params);
    const searchQuery = new URLSearchParams(
      nonEmptyParams as unknown as Record<string, any>,
    );
    const url =
      this.configService.get('MICROSERVICE_URL') +
      microserviceEndpoints.suggestions.locations +
      '?' +
      searchQuery.toString();
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return LocationResponseSchema.parse(data);
  }

  async getEventTypes(dto: EventTypeDto): Promise<EventTypeResponseDto[]> {
    const params = {
      eventTypeGroup: dto.type,
      ids: dto.ids,
      limit: dto.limit,
      offset: dto.offset,
      query: dto.query,
      slugs: dto.slugs,
    };
    const nonEmptyParams = this.sharedService.getNonEmptyParams(params);
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
    if (error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data.map((eventType: any) =>
      EventTypeResponseSchema.parse(eventType),
    );
  }

  async getCategories(dto: CategoryDto): Promise<CategoryResponseDto[]> {
    const params = {
      ids: dto.ids,
      limit: dto.limit,
      offset: dto.offset,
      query: dto.query,
      slugs: dto.slugs,
    };
    const nonEmptyParams = this.sharedService.getNonEmptyParams(params);
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
      limit: dto.limit,
      offset: dto.offset,
      query: dto.query,
      slugs: dto.slugs,
      isDesignation: true,
    };
    const nonEmptyParams = this.sharedService.getNonEmptyParams(params);
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
    return data.map((designation: any) =>
      CategoryResponseSchema.parse(designation),
    );
  }

  async getCompanies(dto: CompanyDto): Promise<CompanyResponseDto[]> {
    const params = {
      ids: dto.ids,
      limit: dto.limit,
      offset: dto.offset,
      query: dto.query,
    };
    const nonEmptyParams = this.sharedService.getNonEmptyParams(params);
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
    if (error) {
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
    return data.map((company: any) => CompanyResponseSchema.parse(company));
  }

  async getTags(dto: TagDto): Promise<TagResponseDto[]> {
    const params = {
      ids: dto.ids,
      limit: dto.limit,
      offset: dto.offset,
      query: dto.query,
      slugs: dto.slugs,
    };
    const nonEmptyParams = this.sharedService.getNonEmptyParams(params);
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
