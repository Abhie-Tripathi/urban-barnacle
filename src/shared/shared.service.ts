// generateSlug : to generate a slug

import { HttpException, Injectable } from '@nestjs/common';
import { JobSource } from '@prisma/client';
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

@Injectable()
export class SharedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suggestionService: SuggestionService,
  ) {}
  generateSlug(title: string) {
    return title.toLowerCase().replace(/ /g, '-');
  }
  async jobCreation(userId: string, inputData: any, source: JobSource) {
    try {
      const job = await this.prisma.requestedJob.create({
        data: {
          userId: String(userId),
          inputData: inputData,
          source: source,
        },
      });
      return { job };
    } catch (error) {
      return { error };
    }
  }

  getNonEmptyParams(params: any) {
    return Object.keys(params).reduce(
      (acc, key) => {
        if (
          (typeof params[key] === 'string' && params[key]) ||
          (typeof params[key] === 'object' &&
            Object.keys(params[key]).length > 0) ||
          typeof params[key] === 'number' ||
          typeof params[key] === 'boolean'
        ) {
          acc[key] = params[key];
        }
        return acc;
      },
      {} as Record<string, any>,
    );
  }

  async convertSlugParamsToIds(params: any, validateIds: boolean = true) {
    if (params.categories && params.categories.length > 0 && validateIds) {
      const categoriesSlug = params.categories as string[];
      const categories = (await this.suggestionService.getSuggestions(
        'categories',
        {
          slugs: categoriesSlug,
          limit: categoriesSlug.length.toString(),
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
          limit: locationIds.length.toString(),
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
          limit: designationsSlugs.length.toString(),
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
        limit: tagsSlug.length.toString(),
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
          limit: eventTypesSlug.length.toString(),
        } as EventTypeDto,
      )) as EventTypeResponseDto[];
      if (
        eventTypes &&
        (eventTypes.length === 0 || eventTypes.length !== eventTypesSlug.length)
      ) {
        throw new HttpException('Invalid event type', 400);
      }
      params['eventTypes'] = eventTypes.map((eventType) => eventType.id);
    }
    if (params.geoCoordinates) {
      params.geoCoordinates = JSON.stringify(params.geoCoordinates);
    }
    if (params.viewBound && validateIds) {
      params.viewBound = JSON.stringify(params.viewBound);
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
            limit: categoriesIds.length.toString(),
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
            limit: designationsIds.length.toString(),
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
          limit: tagsSlug.length.toString(),
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
            limit: eventTypesIds.length.toString(),
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
            limit: locationIds.length.toString(),
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
}
