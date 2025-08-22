// generateSlug : to generate a slug

import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JobSource, Prisma, SubscriptionPlan } from '@prisma/client';
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
  advanceFilterBlockObject,
  CachedUserSchema,
  defaultEventTypes,
  membershipLimit,
  membershipMap,
  SelectedUserDetails,
  TCachedUser,
} from 'src/utils/types';

import * as turf from 'turf';
import { ProspectSchemaDto } from './shared.dto';
import { decrypt, encrypt, REDIS_TTL } from 'src/utils';
import { PointColumn } from './types';
import { microserviceEndpoints } from 'src/utils/endpoints';
import {
  fetchDatafromMicroService,
} from './microservice.api';
import { RedisService } from 'src/redis/redis.service';
import { jobCompositeSchema } from 'src/events/dto';
import { IntentDataService } from 'src/intent/intent.data.service';
import { log } from 'console';

@Injectable()
export class SharedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suggestionService: SuggestionService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly redisService: RedisService,
    private readonly intentDataService: IntentDataService,
  ) { }

  async signToken(user: SelectedUserDetails, token: string) {
    const tokenData: TCachedUser = { ...user, token };
    await this.redisService.set(`user-${token}`, JSON.stringify(tokenData), REDIS_TTL);
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
    console.log(params);
    if (params.categories && params.categories.length > 0 && validateIds) {
      console.log(params.categories);
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
      const uniqueCountries = new Set<string>();
      locations.formattedLocations.forEach((location) => {
        if (location.locationType === 'COUNTRY') {
          uniqueCountries.add(location.id);
        } else {
          if (location.country?.id) {
            uniqueCountries.add(location.country.id);
          }
        }
      });
      params['countries'] = Array.from(uniqueCountries);
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
    if (params.jobComposite) {
      const jobCompositeData = JSON.parse(params.jobComposite);
      const jobCompositeDataObj: { designationIds: string[] | undefined, departmentIds: string[] | undefined, role: string[] | undefined } = {
        departmentIds: jobCompositeData.conditions?.departmentIds,
        designationIds: jobCompositeData?.designationIds,
        role: jobCompositeData.conditions?.seniorityIds
      };
      const designationsIds = [...(jobCompositeDataObj.departmentIds && jobCompositeDataObj.departmentIds.length > 0
        ? jobCompositeDataObj.departmentIds : []),
      ...(jobCompositeDataObj.designationIds && jobCompositeDataObj.designationIds.length > 0
        ? jobCompositeDataObj.designationIds : []),
      ...(jobCompositeDataObj.role && jobCompositeDataObj.role.length > 0
        ? jobCompositeDataObj.role : [])];

      // console.log(jobCompositeData, jobCompositeDataObj, designationsIds);

      const designations = (await this.suggestionService.getSuggestions(
        'designations',
        {
          isDesignation: true,
          isRole: true,
          isDepartment: true,
          limit: designationsIds.length,
          offset: 0,
          ids: designationsIds.join(',')
        },
      )) as { id: string, name: string, role: string, department: string, }[];
      // console.log("designationsdesignationsdesignations", designations);

      if (
        designations &&
        (designations.length === 0 ||
          designations.length !== designationsIds.length)
      ) {
        throw new HttpException('Invalid designation', 400);
      }

      if (jobCompositeDataObj.departmentIds) {
        jobCompositeDataObj.departmentIds.forEach(val => {
          const find_response = designations.find(value => val === value['id']);
          if (!find_response) {
            return;
          }
          if (!params['departments']) {
            params['departments'] = {};
          }
          params['departments'][val] = find_response['department'];
        });
      }
      if (jobCompositeDataObj.designationIds) {
        jobCompositeDataObj.designationIds.forEach(val => {
          const find_response = designations.find(value => val === value['id']);
          if (!find_response) {
            return;
          }
          if (!params['designations']) {
            params['designations'] = {};
          }
          params['designations'][val] = find_response['name'];
        });
        console.log("paramsparamsparams", params, designations, jobCompositeDataObj);

      }
      if (jobCompositeDataObj.role) {
        jobCompositeDataObj.role.forEach(val => {
          const find_response = designations.find(value => val === value['id']);
          if (!find_response) {
            return;
          }
          if (!params['seniorities']) {
            params['seniorities'] = {};
          }
          params['seniorities'][val] = find_response['role'];
        });
      }
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
    // if (query.limit > 20) {
    //   query.limit = 20;
    // }
    const { type, ...rest } = query;
    id = decrypt(id).replace(
      process.env.TEN_TIMES_ID_ENCRYPT_KEY as string,
      '',
    );
    const baseURL = process.env.MICROSERVICE_URL || '';
    const backend = process.env.BACKEND;
    if (backend && backend in defaultEventTypes) {
      rest['eventTypes'] = Object.values(defaultEventTypes[backend]);
    }
    const endpoint =
      query.type === 'user'
        ? microserviceEndpoints.user.events.replace(':userId', id)
        : microserviceEndpoints.company.events.replace(':companyId', id);
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
          let association: string | undefined = undefined;
          if (
            val['trackerMatchInfo'] &&
            val['trackerMatchInfo']['peopleFinderPersonAssociation'][0]
          ) {
            association = (
              val['trackerMatchInfo'][
              'peopleFinderPersonAssociation'
              ][0] as string
            ).includes('speaker')
              ? 'SPEAKER'
              : 'VISITOR';
          }
          return {
            ...val,
            ...(query.type === 'user' ? { association: association } : {}),
          };
        }),
      };
      return { data: responseToReturn };
    } else {
      const countryData: { data: Country[] } = { data: data.data };
      return {
        data: countryData.data,
      };
    }
  }
  async getCompanyAndUserDataForProspect(
    query: ProspectSchemaDto,
    viewAs: string,
    viewBy: string,
  ) {
    // query.limit = Math.min(query.limit, 10);
    const callMicroService = async (queryParam: any) => {
      const response = await fetchDatafromMicroService(
        viewBy === 'company'
          ? viewAs === 'detail'
            ? 'companybyId'
            : 'companysearch'
          : viewAs === 'detail'
            ? 'userbyId'
            : 'usersearch',
        queryParam,
      );
      const responseData = response;
      // console.log(responseData);
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
        responseData.count ?? 0,
      ];
    };

    if (viewBy === 'company') {
      if (viewAs === 'detail' && query.companyId) {
        query.companyId = decrypt(query.companyId).replace(
          process.env.TEN_TIMES_ID_ENCRYPT_KEY!,
          '',
        );
        // const { } = query;
        return {
          data: {
            companyData: await callMicroService({ companyId: query.companyId }),
          },
        };
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
        return {
          data: { userData: await callMicroService({ userId: query.userId }) },
        };
      }
      const [userData, totalCount] = await callMicroService(query);
      return { data: { userData, totalCount } };
    }
    return { data: { message: 'Wrong view selected' } };
  }
  async getPointForRequest(
    column: PointColumn,
    accountId: string,
    advanceColumn: PointColumn,
    isBasic: boolean = true
  ) {
    const [pointsData, userData] = await Promise.all([this.prisma.account.findFirst({
      where: { id: accountId },
      select: {
        currentSubscriptionId: true,
        configurationId: true,
        subscription: {
          where: {
            deleted: false
          },
          select: { plan: true, purchaseValue: true, id: true, updatedAt: true, [advanceColumn]: true, [column]: true, deleted: true, }
        },
      },
    }), this.prisma.user.findMany({
      where: {
        primaryAccountId: accountId
      }, take: 1
    })]);
    // console.log({ pointsData, membership12: pointsData?.subscription });
    if (
      !pointsData?.subscription ||
      pointsData.subscription[0][column] === null ||
      typeof pointsData.subscription[0][column] !== 'number'
    ) {
      throw new HttpException(
        `Invalid point value for column ${column}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    let basicPoints: number = pointsData.subscription[0][column];
    let advancePoints: number = pointsData.subscription[0][advanceColumn];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // set time to 00:00:00

    const updatedAt = new Date(pointsData.subscription[0]['updatedAt']);
    updatedAt.setHours(0, 0, 0, 0); // strip time part
    if (('BASIC' !== pointsData.subscription[0]['plan'] && today > updatedAt) || (userData[0].email.split('@')[1] === '10times.com' && (basicPoints <= 0 || advancePoints <= 0))) {
      // const countOfSubscription = await this.prisma.subscription.count({
      //   where: {
      //     accountId: accountId
      //   }
      // });
      // const createdAt = new Date();
      // const fourteenDaysAgo = new Date(today);
      const createdDate = new Date(pointsData.subscription[0]['updatedAt']);
      createdDate.setHours(0, 0, 0, 0);

      const todayDate = new Date(today);
      todayDate.setHours(0, 0, 0, 0);

      const fourteenDaysAgo = new Date(todayDate);
      fourteenDaysAgo.setDate(todayDate.getDate() - 14);
      fourteenDaysAgo.setDate(today.getDate() - 14);
      if (pointsData.subscription[0]['purchaseValue'] === 0 && createdDate < fourteenDaysAgo && 'ESSENTIAL' === pointsData.subscription[0]['plan']) {
        const schemaName = process.env.NODE_ENV === 'development' ? 'temp_migration' : 'public';
        const [newSubscription] = await Promise.all([this.prisma.subscription.create({
          data: {
            plan: 'BASIC',
            pendingCompanySearchRequests: 0,
            pendingPocUnlockRequests: 0,
            advancePendingRequests: 0,
            pendingProspectPocUnlockRequests: 0,
            pendingRequests: 0,
            planEndDate: new Date(),
            accountId: accountId
          },
          select: {
            id: true
          }
        }),
        this.prisma.subscription.update({
          where: {
            id: pointsData.currentSubscriptionId
          }, data: {
            deleted: true
          }
        })
          ,
        await this.prisma.$executeRaw(
          Prisma.sql`
              UPDATE ${Prisma.raw(`${schemaName}`)}."Configuration"
              SET config = jsonb_set(
                COALESCE(config, '{}'::jsonb),
                '{filter}',
                ${JSON.stringify(advanceFilterBlockObject)}::jsonb,
                true
              )
              WHERE id::TEXT = ${pointsData.configurationId}
            `
        )]);
        await this.prisma.account.update({
          where: {
            id: accountId
          },
          data: {
            currentSubscriptionId: newSubscription.id
          }
        })
        throw new HttpException(
          'Your trial period has ended. Please upgrade your plan to continue using Search features.',
          HttpStatus.FORBIDDEN,
        );

      } else {
        const dailyCreaditForBasic = await this.prisma.subscription.update({
          where: {
            id: pointsData.currentSubscriptionId
          },
          data: {
            ...(userData.length > 0 && userData[0].email.split('@')[1] === '10times.com' ?
              {
                pendingRequests: 800000,
                advancePendingRequests: 1800000,
                pendingCompanySearchRequests: 800000,
                pendingPocUnlockRequests: 20000,
                pendingProspectPocUnlockRequests: 20000,
              } : {
                pendingRequests: 200,
              })
          }
        });
        basicPoints = dailyCreaditForBasic[column];
        advancePoints = dailyCreaditForBasic.advancePendingRequests;
      }
    }
    if (pointsData.subscription[0]['plan'] === 'BASIC') {
      throw new HttpException(
        'Your trial period has ended. Please upgrade your plan to continue.',
        HttpStatus.FORBIDDEN,
      );
    }
    const isNotUnlockRequestColumn =
      column !== PointColumn.pendingPocUnlockRequests &&
      column !== PointColumn.pendingProspectPocUnlockRequests;

    const isBasicPlan = pointsData.subscription[0]['plan'] === 'BASIC';


    // Case 1: Advanced search token exhausted
    if (
      column === PointColumn.advancePendingRequests &&
      isNotUnlockRequestColumn &&
      !isBasicPlan &&
      Math.abs(basicPoints) > 0 &&
      advancePoints <= 0
    ) {
      throw new HttpException(
        `You’ve exhausted your Advanced Search tokens. You can continue with basic searches or upgrade to a higher plan.`,
        HttpStatus.TOO_MANY_REQUESTS,
        {
          cause: (column as string) === 'pendingRequests' && (advanceColumn as string) === 'advancePendingRequests' ?
            `{"advanceToken":${advancePoints > 0},"basicToken":${(basicPoints) > 0}}` :
            `{"basicToken":${(basicPoints) > 0}}`
        }
      );
    }

    // Case 2: Daily limit reached
    if (
      isBasic &&
      isNotUnlockRequestColumn &&
      basicPoints <= 0 && advancePoints !== 0 &&
      (Math.abs(basicPoints) >= (advancePoints * 0.5)
        || Math.abs(basicPoints) >= 50)
    ) {
      throw new HttpException(
        'You have reached your daily limit. It will reset tomorrow.',
        HttpStatus.TOO_MANY_REQUESTS,
        {
          cause: (column as string) === 'pendingRequests' && (advanceColumn as string) === 'advancePendingRequests' ?
            `{"advanceToken":${advancePoints > 0},"basicToken":${Math.abs(basicPoints) <= (advancePoints * 0.5)
            && Math.abs(basicPoints) < 50}}` :
            `{"basicToken":${(basicPoints) > 0}}`
        }
      );
    }
    // Case 3: Advanced and basic search token exhausted
    if (
      isNotUnlockRequestColumn &&
      (basicPoints) <= 0 &&
      advancePoints <= 0
    ) {
      throw new HttpException(
        `You’ve exhausted your search tokens. Please upgrade to a higher plan to continue.`,
        HttpStatus.TOO_MANY_REQUESTS,
        {
          cause: (column as string) === 'pendingRequests' && (advanceColumn as string) === 'advancePendingRequests' ?
            `{"advanceToken":${advancePoints > 0},"basicToken":${Math.abs(basicPoints) <= (advancePoints * 0.5)
            && Math.abs(basicPoints) < 50}}` :
            `{"basicToken":${(basicPoints) > 0}}`
        }
      );
    }

    return { point: basicPoints, subscriptionId: pointsData.currentSubscriptionId, advancePoint: advancePoints };
  }
  async deductPointForRequest(
    column: PointColumn,
    accountId: string,
    remainingPoints: number,) {
    const { point, subscriptionId } = await this.getPointForRequest(column, accountId, PointColumn.advancePendingRequests);
    // if (point <= 0) {
    //   throw new HttpException(
    //     `You have reached the maximum limit to view data. Please get in touch with us.`,
    //     HttpStatus.TOO_MANY_REQUESTS,
    //   );
    // }
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { [column]: remainingPoints },
    });
    return { data: { message: 'points updated' } };
  }
  async creditPointForRequest(column: PointColumn, accountId: string, creditAmmount: number = 1) {
    const { point, advancePoint, subscriptionId } = await this.getPointForRequest(column, accountId, PointColumn.advancePendingRequests);
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { [column]: point + creditAmmount, },
    });
    return { data: { message: 'points updated' } };
  }
  async getAccountMemberShipStatus(accountId: string) {
    const pointsData = await this.prisma.account.findFirst({
      where: { id: accountId },
      select: {
        currentSubscriptionId: true,
        subscription: {
          where: {
            deleted: false,
            accountId: accountId
          },
          select: {
            plan: true,
            planEndDate: true,
            planRenewalDate: true,
            planStartDate: true,
            purchaseValue: true
          },
          orderBy: { createdAt: 'desc' }
        }
      },
    });

    const membership = pointsData?.subscription[0];

    if (!membership) {
      throw new HttpException('membership not found', HttpStatus.NOT_FOUND);
    }

    return {
      membership: membershipMap[membership.plan],
      endDate: membership.planEndDate,
      planRenewalDate: membership.planRenewalDate,
      planStartDate: membership.planStartDate,
      isTrial: membership.purchaseValue === 0 && membership.plan === 'ESSENTIAL',
    };
  }
  async getLocationData(locationIds: string[]) {
    const locations = (await this.suggestionService.getSuggestions(
      'locations',
      {
        ids: locationIds,
        limit: locationIds.length,
      } as LocationDto,
    )) as LocationResponseDto;
    return locations;
  }
  async getGroupedEventInterests(
    user: TCachedUser,
    eventIds: string[],
    trackerId: string | undefined = undefined,
  ) {
    const userBookmarks =
      await this.intentDataService.getAllEventInterestsByUser(
        user,
        eventIds,
        trackerId,
        ['BOOKMARK'],
      );
    const interests = await this.intentDataService.getAllEventInterestsByUser(
      user,
      eventIds,
      undefined,
      undefined,
      ['BOOKMARK'],
    );
    const userEventInterests = {};

    interests.forEach((interest) => {
      userEventInterests[interest.eventId] =
        userEventInterests[interest.eventId] || {};
      userEventInterests[interest.eventId][interest.interest.toLowerCase()] = {
        interestId: interest.id,
      };
    });

    userBookmarks.forEach((bookmark) => {
      userEventInterests[bookmark.eventId] =
        userEventInterests[bookmark.eventId] || {};
      userEventInterests[bookmark.eventId]['bookmark'] = {
        interestId: bookmark.id,
      };
    });

    // const groupedInterests = interests.reduce((acc, interest) => {
    //   acc[interest.eventId] = acc[interest.eventId] || {};
    //   acc[interest.eventId][interest.interest.toLowerCase()] = {
    //     interestId: interest.id,
    //   };
    //   return acc;
    // }, {});
    // const groupedBookmarks = userBookmarks.reduce((acc, bookmark) => {
    //   acc[bookmark.eventId] = acc[bookmark.eventId] || {};
    //   acc[bookmark.eventId]['bookmark'] = {
    //     interestId: bookmark.id,
    //   };
    //   return acc;
    // }, {});
    return userEventInterests;
  }
  async getTokenDetails(user: TCachedUser, query: any, isBasic: boolean = true) {
    const [{ point, advancePoint }, membershipStatus] = await Promise.all([this.getPointForRequest(
      PointColumn.pendingRequests,
      user.accountId,
      PointColumn.advancePendingRequests, isBasic
    ), this.getAccountMemberShipStatus(user.accountId)]);
    console.log({ point, advancePoint, query, membershipStatus, isBasic });
    // if (point <= 0) {
    //   throw new HttpException(
    //     'You have reached the maximum limit to view data. Please get in touch with us.',
    //     HttpStatus.TOO_MANY_REQUESTS,
    //   );
    // }
    if (isBasic && point <= 0 && advancePoint !== 0 && (Math.abs(point) >= (advancePoint * 0.5) || Math.abs(point) >= 50)) {
      throw new HttpException(
        'You have reached your daily limit. It will reset tomorrow.',
        HttpStatus.BAD_REQUEST,
        { cause: `{"advanceToken":${advancePoint > 0},"basicToken":${(Math.abs(point) <= (advancePoint * 0.5) && Math.abs(point) < 50)}}` }
      );
    }
    if (query.limit && membershipLimit[membershipStatus.membership].perSearchLimit < query.limit) {
      query.limit = membershipLimit[membershipStatus.membership].perSearchLimit;
    }
    if ((membershipLimit[membershipStatus.membership].upperLimit - ((query.limit || 10) + (query.offset || 0))) < 0) {
      throw new HttpException(
        'The server couldn’t understand the request due to invalid syntax or parameters.',
        HttpStatus.FORBIDDEN,
      );
    }
    if (query.limit && isBasic && query.limit > Math.abs(point)) {
      query.limit = Math.abs(point);
    } else if (query.limit && !isBasic && query.limit > advancePoint) {
      query.limit = advancePoint;
    }

    // if ((membershipLimit[membershipStatus.membership] - ((query.limit || 10) + (query.offset || 0))) < 0) {
    //   throw new HttpException(
    //     'You have reached the maximum limit to view data. Please get in touch with us.',
    //     HttpStatus.TOO_MANY_REQUESTS,
    //   );
    // }
    return { point, advancePoint, query: { ...query } };
  }
}

export interface Country {
  id: string;
  countryCode?: string;
  name: string;
  participation?: any;
  count: number;
  countryZone?: string;
  longitude: string;
  latitude: string;
}
