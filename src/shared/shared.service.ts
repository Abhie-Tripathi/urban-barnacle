// generateSlug : to generate a slug

import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JobSource } from '@prisma/client';
import { randomUUID } from 'crypto';
import { FeatureCollection } from 'geojson';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CategoryDto,
  CategoryResponseDto,
  EventTypeDto,
  EventTypeResponseDto,
  LocationDto,
  LocationResponseDto,
} from 'src/suggestion/dto';
import { TagResponseDto } from 'src/suggestion/dto/tags.dto';
import { SuggestionService } from 'src/suggestion/suggestion.service';
import { UserResponseSchema } from 'src/user/me/dto';
import {
  CachedUserSchema,
  SelectedUserDetails,
  TCachedUser,
} from 'src/utils/types';

import * as turf from 'turf';
import { ProspectSchemaDto } from './shared.dto';
import { decrypt, encrypt } from 'src/utils';
import { PointColumn } from './types';
import { microserviceEndpoints } from 'src/utils/endpoints';
import { EventDataDto } from 'src/events/dto';
import { transformEventData } from 'src/events/global.service';
import { fetchDatafromMicroService, microServiceApis } from './microservice.api';

@Injectable()
export class SharedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suggestionService: SuggestionService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) { }

  async signToken(user: SelectedUserDetails, token: string) {
    const tokenData: TCachedUser = { ...user, token };
    await this.cacheManager.set(token, tokenData, 1000 * 60 * 60 * 24 * 365);
    return token;
  }

  async UserResponse(user: SelectedUserDetails, token?: string) {
    if (!token) {
      token = randomUUID();
    }
    const userData = CachedUserSchema.parse(user);
    await this.signToken(userData, token);
    return UserResponseSchema.parse({ userData, token });
  }

  generateSlug(title: string) {
    return title.toLowerCase().replace(/ /g, '-');
  }
  async jobCreation(
    userId: string,
    inputData: any,
    source: JobSource,
    sourceId: string,
  ) {
    try {
      const job = await this.prisma.requestedJob.create({
        data: {
          userId: String(userId),
          inputData: inputData,
          source: source,
          sourceId: sourceId,
        },
      });
      return { job };
    } catch (error) {
      return { error };
    }
  }

  async convertSlugParamsToIds(
    params: any,
    validateIds: boolean = true,
    transformViewBound = true,
  ) {
    if (params.categories && params.categories.length > 0 && validateIds) {
      const categoriesSlug = params.categories as string[];
      const categories = (await this.suggestionService.getSuggestions(
        'categories',
        {
          slugs: categoriesSlug,
          limit: categoriesSlug.length,
        } as CategoryDto,
      )) as CategoryResponseDto[];
      if (
        categories &&
        validateIds &&
        (categories.length === 0 || categories.length !== categoriesSlug.length)
      ) {
        throw new HttpException('Invalid category', 400);
      }
      params['categories'] = categories.map((category) => category.id);
    }
    if (params.locationIds && params.locationIds.length > 0 && validateIds) {
      const locationIds = params.locationIds as string[];
      const locations = (await this.suggestionService.getSuggestions(
        'locations',
        {
          ids: locationIds,
          limit: locationIds.length,
        } as LocationDto,
      )) as LocationResponseDto;

      if (
        locations &&
        locations.formattedLocations &&
        (locations.formattedLocations.length === 0 ||
          locations.formattedLocations.length !== locationIds.length)
      ) {
        throw new HttpException('Invalid location', 400);
      }
      params['locationIds'] = params.locationIds;
    }
    if (params.designations && params.designations.length > 0 && validateIds) {
      const designationsSlugs = params.designations as string[];
      const designations = (await this.suggestionService.getSuggestions(
        'designations',
        {
          slugs: designationsSlugs,
          limit: designationsSlugs.length,
        } as CategoryDto,
      )) as CategoryResponseDto[];
      if (
        designations &&
        (designations.length === 0 ||
          designations.length !== designationsSlugs.length)
      ) {
        throw new HttpException('Invalid designation', 400);
      }
      params['designations'] = designations.map(
        (designation) => designation.id,
      );
    }

    const tagsSlug = params.tags as string[];
    if (tagsSlug && tagsSlug.length > 0 && validateIds) {
      const tags = (await this.suggestionService.getSuggestions('tags', {
        slugs: tagsSlug,
        limit: tagsSlug.length,
      })) as TagResponseDto[];

      if (tags && (tags.length === 0 || tags.length !== tagsSlug.length)) {
        throw new HttpException('Invalid tag', 400);
      }
      params['tags'] = tags.map((tag) => tag.id);
    }

    const eventTypesSlug = params.eventTypes as string[];
    if (eventTypesSlug && eventTypesSlug.length > 0 && validateIds) {
      const eventTypes = (await this.suggestionService.getSuggestions(
        'event-types',
        {
          slugs: eventTypesSlug,
          limit: eventTypesSlug.length,
        } as EventTypeDto,
      )) as EventTypeResponseDto[];
      if (
        eventTypes &&
        (eventTypes.length === 0 || eventTypes.length !== eventTypesSlug.length)
      ) {
        throw new HttpException(
          {
            message: 'Invalid event type',
            issues: [
              {
                message: 'Invalid event type',
                code: 'invalid_event_type',
              },
            ],
          },
          400,
        );
      }
      params['eventTypes'] = eventTypes.map((eventType) => eventType.id);
    }
    // if (params.geoCoordinates) {
    //   params.geoCoordinates = JSON.stringify(params.geoCoordinates);
    // }
    if (params.viewBound) {
      params.viewBound = transformViewBound
        ? JSON.stringify(params.viewBound)
        : params.viewBound;
    }
    return params;
  }

  async convertIdParamsToSlug(params: any) {
    try {
      if (params.categories && params.categories.length > 0) {
        const categoriesIds = params.categories as string[];
        const categories = (await this.suggestionService.getSuggestions(
          'categories',
          {
            ids: categoriesIds,
            limit: categoriesIds.length,
          } as CategoryDto,
        )) as CategoryResponseDto[];

        if (
          categories &&
          (categories.length === 0 ||
            categories.length !== categoriesIds.length)
        ) {
          throw new HttpException('Invalid category', 400);
        }

        params['categories'] = categories.reduce((acc: any, category: any) => {
          acc[category.id] = {
            id: category.id,
            slug: category.slug,
            name: category.name,
          };
          return acc;
        }, {});
      }

      if (params.designations && params.designations.length > 0) {
        const designationsIds = params.designations as string[];
        const designations = (await this.suggestionService.getSuggestions(
          'designations',
          {
            ids: designationsIds,
            limit: designationsIds.length,
          } as CategoryDto,
        )) as CategoryResponseDto[];

        if (
          designations &&
          (designations.length === 0 ||
            designations.length !== designationsIds.length)
        ) {
          throw new HttpException('Invalid designation', 400);
        }

        params['designations'] = designations.reduce(
          (acc: any, designation: any) => {
            acc[designation.id] = {
              name: designation.name,
              slug: designation.slug,
            };
            return acc;
          },
          {},
        );
      }

      const tagsSlug = params.tags as string[];
      if (tagsSlug && tagsSlug.length > 0) {
        const tags = (await this.suggestionService.getSuggestions('tags', {
          slugs: tagsSlug,
          limit: tagsSlug.length,
        })) as TagResponseDto[];

        if (tags && (tags.length === 0 || tags.length !== tagsSlug.length)) {
          throw new HttpException('Invalid tag', 400);
        }

        params['tags'] = tags.reduce((acc: any, tag: any) => {
          acc[tag.id] = {
            name: tag.name,
            slug: tag.slug,
          };
          return acc;
        }, {});
      }

      const eventTypesIds = params.eventTypes as string[];
      if (eventTypesIds && eventTypesIds.length > 0) {
        const eventTypes = (await this.suggestionService.getSuggestions(
          'event-types',
          {
            ids: eventTypesIds,
            limit: eventTypesIds.length,
          } as EventTypeDto,
        )) as EventTypeResponseDto[];

        if (
          eventTypes &&
          (eventTypes.length === 0 ||
            eventTypes.length !== eventTypesIds.length)
        ) {
          throw new HttpException('Invalid event type', 400);
        }
        params['eventTypes'] = eventTypes.reduce((acc: any, eventType: any) => {
          acc[eventType.id] = {
            name: eventType.name,
            slug: eventType.slug,
          };
          return acc;
        }, {});
      }

      if (params.locationIds && params.locationIds.length > 0) {
        const locationIds = params.locationIds as string[];
        const locations = (await this.suggestionService.getSuggestions(
          'locations',
          {
            ids: locationIds,
            limit: locationIds.length,
          } as LocationDto,
        )) as LocationResponseDto;

        if (
          locations &&
          (locations.formattedLocations.length === 0 ||
            locations.formattedLocations.length !== locationIds.length)
        ) {
          throw new HttpException('Invalid location', 400);
        }
        params['locationIds'] = locations.formattedLocations.reduce(
          (acc: any, location: any) => {
            acc[location.id] = {
              name: location.name,
              displayName: location.displayName,
              latitude: location.latitude,
              longitude: location.longitude,
              locationType: location.locationType,
              ...(location.locationType === 'COUNTRY'
                ? { iso: location.iso }
                : {}),
            };

            return acc;
          },
          {},
        );
      }

      return params;
    } catch (error) {
      console.log(error);
      return params;
    }
  }

  async getArea(geoJson: FeatureCollection) {
    let totalArea = 0;
    geoJson!.features!.forEach((feature) => {
      if (feature.geometry.type === 'MultiPolygon') {
        const multiPolygon = turf.multiPolygon(feature.geometry.coordinates);
        totalArea += turf.area(multiPolygon) / 1000000;
      } else if (feature.geometry.type === 'Polygon') {
        const polygon = turf.polygon(feature.geometry.coordinates);
        totalArea += turf.area(polygon) / 1000000;
      }
      if (totalArea > 0) {
        return;
      }
    });
    return Number(totalArea.toFixed(2));
  }
  async getProspectEventAndMap(id: string, query: any) {
    if (query.limit > 20) {
      query.limit = 20;
    }
    const { type, ...rest } = query;
    id = decrypt(id).replace(
      process.env.TEN_TIMES_ID_ENCRYPT_KEY as string,
      '',
    );
    const baseURL = process.env.MICROSERVICE_URL || '';
    const endpoint = query.type === 'user' ? microserviceEndpoints.user.events.replace(':userId', id) : microserviceEndpoints.company.events.replace(':companyId', id);
    const queryString = new URLSearchParams(rest).toString();
    const url = `${baseURL}${endpoint}?${queryString}`;
    const response = await fetch(url, {
      method: 'GET',
    });
    const data = (await response.json()) as any;
    console.log(data, url);
    if (!query.groupBy) {
      const responseToReturn: { count: Number; events: any[] } = {
        count: data.data.count,
        events: data.data.events.map((val: any) => {
          return {
            ...val,
            ...(query.type === 'user' ? { association: 'SPEAKER' } : {}),
          };
        }),
      };
      return { data: responseToReturn };
    } else {
      const countryData: { data: Country[] } = { data: data.data };
      return {
        data: countryData.data.map((val) => {
          return {
            count: val.eventCount,
            id: val.countryId,
            name: val.name,
            latitude: val.geoCordinates.latitude,
            longitude: val.geoCordinates.longitude,
            participation: val.participation,
            code: val.countryCode,
          };
        }),
      };
    }
  }
  async getCompanyAndUserDataForProspect(
    query: ProspectSchemaDto,
    viewAs: string,
    viewBy: string,
  ) {
    query.limit = Math.min(query.limit, 10);
    const callMicroService = async (queryParam: any) => {
      const response = await fetchDatafromMicroService(viewBy === 'company' ? viewAs === 'detail' ? 'companybyId' : 'companysearch' : viewAs === 'detail' ? 'userbyId' : 'usersearch', queryParam);
      const responseData = response;
      console.log(responseData);
      if (viewAs === 'detail') {
        return responseData?.data?.id
          ? {
            ...responseData.data,
            id: encrypt(
              responseData.data.id + process.env.TEN_TIMES_ID_ENCRYPT_KEY!,
            ),
          }
          : {
            ...responseData.data,
            user_id: encrypt(
              responseData.data.user_id +
              process.env.TEN_TIMES_ID_ENCRYPT_KEY!,
            ),
          };
      }
      if (responseData.data?.error) {
        throw new HttpException(
          responseData.data.error,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return [
        (responseData.data ?? []).map((data) => ({
          ...data,
          [viewBy === 'company' ? 'id' : 'user_id']:
            viewBy === 'company'
              ? encrypt(data.id + process.env.TEN_TIMES_ID_ENCRYPT_KEY!)
              : encrypt(data.user_id + process.env.TEN_TIMES_ID_ENCRYPT_KEY!),
        })),
        responseData.totalCount ?? 0,
      ];
    };

    if (viewBy === 'company') {
      if (viewAs === 'detail' && query.companyId) {
        query.companyId = decrypt(query.companyId).replace(
          process.env.TEN_TIMES_ID_ENCRYPT_KEY!,
          '',
        );
        // const { } = query;
        return { data: { companyData: await callMicroService({ companyId: query.companyId }) } };
      }
      const [companyData, totalCount] = await callMicroService(query);
      return { data: { companyData, totalCount } };
    }

    if (viewBy === 'user') {
      if (viewAs === 'detail' && query.userId) {
        query.userId = decrypt(query.userId).replace(
          process.env.TEN_TIMES_ID_ENCRYPT_KEY!,
          '',
        );
        return { data: { userData: await callMicroService({ userId: query.userId }) } };
      }
      const [userData, totalCount] = await callMicroService(query);
      return { data: { userData, totalCount } };
    }
    return { data: { message: 'Wrong view selected' } };
  }
  async getPointForRequest(
    column: PointColumn,
    subscriptionId: string,
  ): Promise<number> {
    const pointsData = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId },
      select: { [column]: true },
    });
    if (
      !pointsData ||
      pointsData[column] === null ||
      typeof pointsData[column] !== 'number'
    ) {
      throw new HttpException(
        `Invalid point value for column ${column}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return pointsData[column];
  }
  async deductPointForRequest(
    column: PointColumn,
    subscriptionId: string,
    remainingPoints: number,
  ) {
    const point = await this.getPointForRequest(column, subscriptionId);
    if (point <= 0) {
      throw new HttpException(
        `You have reached the maximum limit to view data. Please get in touch with us.`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { [column]: remainingPoints },
    });
    return { data: { message: 'points updated' } };
  }
  async creditPointForRequest(column: PointColumn, subscriptionId: string) {
    const point = await this.getPointForRequest(column, subscriptionId);
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { [column]: point + 1 },
    });
    return { data: { message: 'points updated' } };
  }
}

export interface Event {
  id: string;
  name: string;
  status: string;
  url: string;
  entryType: string | null;
  eventWebsite: string;
  eventZone: string[];
  audienceSpread: Record<string, unknown>;
  audienceZone: string;
  description: string;
  createdAt: string;
  location: {
    cityId: string;
    cityName: string;
    countryId: string;
    cityCordinates: {
      longitude: string;
      latitude: string;
    };
    countryCode: string;
    countryName: string;
    venueName: string;
    venueAddress: string;
    geoCordinates: {
      longitude: string;
      latitude: string;
    };
  };
  stats: {
    score: number;
    eventFollower: number;
    estimatedVisitor: string;
  };
  startDate: string;
  endDate: string;
  duration: string;
  editionCount: number;
  format: string;
  type: string[];
  categories: {
    id: string;
    name: string;
    slug: string;
    isGroup: boolean;
  }[];
  eventKeywords: string[];
  organizer: {
    id: string;
    name: string;
    website: string;
    logo: string | null;
    cityName: string;
    countryName: string;
    totalExhibit: number;
    totalSponsor: number;
    totalVisitor: number;
    totalOrganize: number;
  };
  trackerIntelScore: number | null;
  eventRank: number;
  localRank: number;
  'trustScore%': number;
  logoUrl: string;
  reputationSentiment: number;
  interestsGrowth: number;
  eventSize: string;
  estimatedVisitorRangeTag: string;
  'internationalAudience%': string;
  ticketPriceLink: string | null;
  matchedKeywords: string[];
  keywordsMatchedScore: number;
}

export interface Country {
  countryId: string;
  countryCode: string;
  name: string;
  participation: any;
  eventCount: number;
  countryZone: string;
  geoCordinates: {
    longitude: string;
    latitude: string;
  };
}
