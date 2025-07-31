import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { TrackerDataService } from './tracker.data.service';
import {
  blackListDomain,
  defaultEventTypes,
  LastActive,
  membershipLimit,
  TCachedUser,
} from 'src/utils/types';
import {
  CreateTrackerDto,
  CreateTrackerExportsDto,
  GetTrackerByIdDto,
  GetTrackerCommentDto,
  GetTrackerEventsCountDto,
  GetTrackerEventsDto,
  GetTrackerIntelScoreDto,
  GetTrackersHttpDto,
  GetTrackerUsersDto,
  SimilarTrackerEventDto,
  UpdateTrackerHttpDto,
} from './dto';
import { AccessService } from 'src/access/access.service';
import { AccessDataService } from 'src/access/access.data.service';
import {
  getNameFromEmail,
  getNonEmptyParams,
  TrackerIntelScoreJson,
} from 'src/utils';
import { SharedService } from 'src/shared/shared.service';
import { EventsService } from 'src/events/events.service';
import { CountGroup, CountQueryDto, QueryDto, View } from 'src/events/dto';
import { IntentDataService } from 'src/intent/intent.data.service';
import {
  AccessType,
  ExportSubSource,
  Prisma,
  Tracker,
  TrackerTypeTag,
  User,
} from '@prisma/client';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { UserDataService } from 'src/user/user.data.service';
import { CommentService } from 'src/comment/comment.service';
import { CreateAccessHttpDto, UpdateAccessHttpDto } from 'src/access/dto';
import { createHash, randomUUID } from 'crypto';
import { CommentsResponseSchema } from 'src/comment/dto/response';
import { ConfigService } from '@nestjs/config';
import { QueryFilter, QueryFilterDto } from 'src/events/dto/query.dto';
import { AccountDataService } from 'src/user/account/account.data.service';
import { microserviceEndpoints } from 'src/utils/endpoints';
import { RedisService } from 'src/redis/redis.service';
import { trackerExportDto } from 'src/communication/bull.dto';
// import { log } from 'console';
import { LimitDto } from 'src/global_dto';
@Injectable()
export class TrackerService {
  constructor(
    private readonly trackerDataService: TrackerDataService,
    private readonly accessDataService: AccessDataService,
    private readonly accessService: AccessService,
    private readonly sharedService: SharedService,
    private readonly eventService: EventsService,
    private readonly intentDataService: IntentDataService,
    private readonly commentService: CommentService,
    private readonly userDataService: UserDataService,
    private readonly configService: ConfigService,
    private readonly accountDataService: AccountDataService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly redisService: RedisService,
  ) { }

  async filterValueRestriction(filterValue: QueryDto) {
    if (filterValue.locationIds) {
      const locationData = await this.sharedService.getLocationData(
        filterValue.locationIds,
      );
      for (const location of locationData['formattedLocations']) {
        if (location.locationType === 'STATE') {
          throw new HttpException(
            'filter not allowed for state',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    }
    // console.log({ filterValue });

    const allowedFilters = [
      'locationIds',
      'categories',
      'active_gte',
      'active_lte',
      'eventTypes',
      'eventIds',
      'show'
    ];
    Object.keys(filterValue).forEach((val) => {
      if (!allowedFilters.includes(val)) {
        throw new HttpException('filter not allowed', HttpStatus.BAD_REQUEST);
      }
    });
  }

  async createTracker(user: TCachedUser, data: CreateTrackerDto) {
    const nonEmptyParams = getNonEmptyParams(data.filterValues);
    let convertedParams = {};
    let eventInfo: { count: number; events: { basic: object }[] } = {
      count: 0,
      events: [],
    };
    if (!data.filterValues.eventIds) {
      convertedParams = await this.sharedService.convertSlugParamsToIds(
        nonEmptyParams,
        true,
        false,
      );
    } else if (
      data.filterValues.eventIds &&
      data.filterValues.eventIds.length > 0
    ) {
      [convertedParams] = await Promise.all([
        this.sharedService.convertSlugParamsToIds(nonEmptyParams, true, false),
        // this.eventService.getAllEvents({
        //   eventIds: data.filterValues.eventIds,
        //   view: View.list,
        //   limit: data.filterValues.eventIds.length,
        //   offset: 0,
        //   showValues: 'basic',
        // }) as unknown as { count: number; events: { basic: object }[] },
        this.filterValueRestriction(nonEmptyParams as any),
      ]);
      // convertedParams['eventIdsFilter'] = eventInfo.events.map((val) => {
      //   return {
      //     [val.basic['id']]: val,
      //   };
      // });
    }
    const tracker = await this.trackerDataService.createTracker(user, {
      ...data,
      filterValues: convertedParams,
    });
    await this.accessDataService.createAccess({
      accessProviderId: user.id,
      accessReceiverId: user.id,
      accessType: 'SUPER_ADMIN',
      accountId: user.accountId,
      sourceEntity: 'TRACKER',
      sourceEntityId: tracker.id,
      flagForEmail: true,
    });
    // console.log("data.cachingFlag==> ", data.cachingFlag);
    try {
      this.getIntelScoreForUpdate(tracker.id, user);
    } catch (error) { }
    if (data.cachingFlag) {
      this.getTrackerResponse(
        user,
        tracker as Tracker & { createdByUser: User; modifiedByUser: User },
        {
          refresh: true,
        },
      );
    }
    return tracker;
  }
  async getTrackerResponse(
    user: TCachedUser,
    tracker: Tracker & { createdByUser: User; modifiedByUser: User },
    query: GetTrackerByIdDto,
  ) {
    let eventInfo: { count: number; events: { basic: object }[] } = {
      count: 0,
      events: [],
    };
    const lastActive = await this.lastActive(
      user,
      tracker.id,
      tracker.createdAt,
    );

    tracker['filterValue'] = {
      ...(tracker['filterValue'] as object),
      ...lastActive,
    };
    const searchByEntity = ['T_COMPETITOR', 'T_CUSTOMER_ICP'].includes(
      tracker.type,
    )
      ? 'company'
      : tracker.type === 'T_PEOPLE_FINDER'
        ? 'user'
        : tracker.type === 'T_SPEAKING_OPPORTUNITY'
          ? 'speaker'
          : tracker.type === 'T_RECRUITMENT'
            ? 'recruitment'
            : tracker.type === 'T_PRODUCT_KEYWORDS'
              ? 'keywords'
              : tracker.type === 'T_EVENT_PARTICIPATION'
                ? 'event'
                : undefined;
    tracker.filterValues = tracker.filterValues
      ? {
        ...(tracker.filterValues as Record<string, any>),
        searchByEntity,
      }
      : { searchByEntity };
    if (searchByEntity && searchByEntity === 'event') {
      // tracker.filterValues['eventIds'] = [];
      [eventInfo] = await Promise.all([
        this.eventService.getAllEvents({
          eventIds: (tracker.filterValues as any).eventIds,
          view: View.list,
          limit: (tracker.filterValues as any).eventIds.length,
          offset: 0,
          showValues: 'basic',
        }) as unknown as { count: number; events: { basic: object }[] },
      ]);
    }
    const savedEventsCount =
      await this.intentDataService.getUserEventInterestCount({
        interest: ['BOOKMARK'],
        sourceModule: { in: ['TRACKER'] },
        sourceId: tracker.id,
        // interestedUserId: user.id,
        accountId: user.accountId,
      });

    const groupBy =
      searchByEntity || this.configService.get('BACKEND') === 'gtm'
        ? CountGroup.status
        : this.configService.get('BACKEND') === 'geo'
          ? CountGroup.eventTypeGroup
          : undefined;
    let cachedValuesString: string | null = await this.redisService.get(
      `tracker-${tracker.id}`,
    );
    let cachedValues: {
      groupedEventsCount: object;
      filterValues: object;
    } | null = cachedValuesString ? JSON.parse(cachedValuesString) : null;
    let { groupedEventsCount, filterValues } = cachedValues ?? {};
    if (
      (!groupedEventsCount && !tracker.type.startsWith('TR_')) ||
      !filterValues ||
      query.refresh
    ) {
      if (!tracker.type.startsWith('TR_')) {
        try {
          groupedEventsCount = (await this.getGroupedEventsCount(
            {
              searchByEntity,
              trackerId: tracker.id,
              ...tracker.filterValues,
              createdAt: lastActive.last_active_gte,
            } as CountQueryDto,
            groupBy ? groupBy : undefined,
          )) ||
            (this.configService.get('BACKEND') && this.configService.get('BACKEND') === 'gtm'
              ? ({ active: 0, new: 0, past: 0 }) : ({ social: 0, business: 0, unattended: 0 }))
            ;
          console.log(groupedEventsCount);

          if (
            this.configService.get('BACKEND') &&
            this.configService.get('BACKEND').toLowerCase() === 'gtm' && groupedEventsCount
            && (groupedEventsCount['active'] !== 0 || groupedEventsCount['new'] !== 0 || groupedEventsCount['past'] !== 0)
          ) {

            if (searchByEntity && searchByEntity === 'event') {
              // tracker.filterValues['eventIds'] = [];
              await this.trackerDataService.bulkDeleteToSimilarTrackerEvent(
                tracker.id,
              );
              const similarEventCache = {
                ...groupedEventsCount!['similarEventCache'],
              };
              delete groupedEventsCount!['similarEventCache'];
              groupedEventsCount = groupedEventsCount!['count'];
              if (searchByEntity && searchByEntity === 'event') {
                const trackerSimilarEventPauload: {
                  trackerId: string;
                  eventId: string;
                  count: number;
                  tag: TrackerTypeTag;
                  sourceId: number;
                  score: number;
                }[] = [];

                if (groupedEventsCount!['past_ids']) {
                  const pastData = (
                    groupedEventsCount!['past_ids'] as string
                  ).split(',');
                  const pastCount: number = pastData.length;
                  for (const eachPastData of pastData) {
                    const eventIds: string[] = eachPastData.split('#');

                    trackerSimilarEventPauload.push({
                      trackerId: tracker.id,
                      count: pastCount,
                      eventId: eventIds[0],
                      sourceId: Number(eventIds[1]),
                      tag: 'PAST',
                      score: similarEventCache[eventIds[1]] || 0,
                    });
                  }
                }
                delete groupedEventsCount!['past_ids'];
                if (groupedEventsCount!['active_ids']) {
                  const activeData = (
                    groupedEventsCount!['active_ids'] as string
                  ).split(',');
                  const activeCount: number = activeData.length;
                  for (const eachActiveData of activeData) {
                    const eventIds: string[] = eachActiveData.split('#');
                    trackerSimilarEventPauload.push({
                      trackerId: tracker.id,
                      count: activeCount,
                      eventId: eventIds[0],
                      sourceId: Number(eventIds[1]),
                      tag: 'ACTIVE',
                      score: similarEventCache[eventIds[1]] || 0,
                    });
                  }
                }
                delete groupedEventsCount!['active_ids'];
                if (groupedEventsCount!['new_ids']) {
                  const newData = (
                    groupedEventsCount!['new_ids'] as string
                  ).split(',');
                  const newCount: number = newData.length;
                  for (const eachNewData of newData) {
                    const eventIds: string[] = eachNewData.split('#');
                    trackerSimilarEventPauload.push({
                      trackerId: tracker.id,
                      count: newCount,
                      eventId: eventIds[0],
                      sourceId: Number(eventIds[1]),
                      tag: 'NEW',
                      score: similarEventCache[eventIds[1]] || 0,
                    });
                  }
                }
                delete groupedEventsCount!['new_ids'];
                if (trackerSimilarEventPauload.length > 0) {
                  await this.trackerDataService.bulkInsertToSimilarTrackerEvent(
                    trackerSimilarEventPauload,
                  );
                }
              }
            }
            if (!groupedEventsCount) {
              groupedEventsCount = {
                active: 0,
                new: 0,
                past: 0
              }
            }

          }
        } catch (error) {
          console.log(error);

        }
      }

      filterValues = await this.sharedService.convertIdParamsToSlug(
        tracker.filterValues,
      );
      if (groupedEventsCount && groupedEventsCount['count']) {
        groupedEventsCount = groupedEventsCount['count'];
      }
      await this.redisService.set(
        `tracker-${tracker.id}`,
        JSON.stringify({
          groupedEventsCount,
          filterValues: tracker.filterValues,
        }),
        82800000,
      );
    }
    if (eventInfo.events && eventInfo.events.length > 0 && filterValues) {
      filterValues['eventIdsFilter'] = eventInfo.events.map((val) => {
        return {
          [val.basic['id']]: val,
        };
      });
    }
    // console.log(tracker.createdByUser);

    const trackerValues = {
      id: tracker.id,
      name: tracker.name,
      type: tracker.type,
      filterValues: filterValues,
      createdAt: tracker.createdAt,
      updatedAt: tracker.updatedAt,
      createdBy: tracker.createdByUser,
      // id: tracker.createdByUser.id,
      // firstname: tracker.createdByUser.firstname,
      // lastname: tracker.createdByUser.lastname,
      // email: tracker.createdByUser.email,
      // imageUrl: tracker.createdByUser.imageUrl,
      lastModifiedBy:
        tracker.modifiedByUser && tracker.modifiedByUser.id
          ? tracker.modifiedByUser
          : null,
    };
    return {
      ...trackerValues,
      groupedEventsCount,
      savedEventsCount,
    };
  }

  async getTrackers(user: TCachedUser, params: GetTrackersHttpDto) {
    // console.log({
    //   accessReceiverId: user.id,
    //   accountId: user.accountId,
    //   sourceEntity: 'TRACKER',
    //   accessTypes:
    //     params.createdBy === 'me'
    //       ? ['SUPER_ADMIN']
    //       : params.createdBy === 'others'
    //         ? ['ADMIN', 'USER']
    //         : ['SUPER_ADMIN', 'ADMIN', 'USER'],
    //   limit: params.limit,
    //   offset: params.offset,
    // });
    // const trackerIds = (
    //   await this.accessService.getAccess({
    //     accessReceiverId: user.id,
    //     accountId: user.accountId,
    //     sourceEntity: 'TRACKER',
    //     accessTypes:
    //       params.createdBy === 'me'
    //         ? ['SUPER_ADMIN']
    //         : params.createdBy === 'others'
    //           ? ['ADMIN', 'USER']
    //           : ['SUPER_ADMIN', 'ADMIN', 'USER'],
    //     limit: params.limit,
    //     offset: params.offset,
    //   })
    // ).map((access) => access.sourceEntityId);
    // const trackerParams = {};
    // if (params.name) trackerParams['name'] = params.name;
    // if (params.subType) trackerParams['subType'] = params.subType;

    const trackers = await this.trackerDataService.getTrackers(
      {
        ...params,
        type: params.type,
        // ids: trackerIds,
        limit: params.limit,
        offset: params.offset,
      },
      user,
    );
    // console.log(trackers);

    const allTrackers = await Promise.all(
      trackers.map((tracker) => {
        const trackerResponse = this.getTrackerResponse(
          user,
          tracker as Tracker & { createdByUser: User; modifiedByUser: User },
          {
            refresh: params.refresh,
          },
        );
        return trackerResponse;
      }),
    );
    return allTrackers;
  }

  async getTrackersCount(
    user: TCachedUser,
    params: GetTrackersHttpDto,
    groupBy: string | null = null,
  ) {
    // const trackerCount = await this.accessService.getAccessCount({
    //   accessReceiverId: user.id,
    //   accountId: user.accountId,
    //   sourceEntity: 'TRACKER',
    //   accessTypes:
    //     params.createdBy === 'me'
    //       ? ['SUPER_ADMIN']
    //       : params.createdBy === 'others'
    //         ? ['ADMIN', 'USER']
    //         : ['SUPER_ADMIN', 'ADMIN', 'USER'],
    // });
    const trackerCount = await this.trackerDataService.getTrackersCount(
      user,
      params,
      groupBy,
    );
    return trackerCount;
  }

  async getTracker(
    user: TCachedUser,
    trackerId: string,
    query: GetTrackerByIdDto,
  ) {
    const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
      'USER',
    ]);
    const trackerResponse = await this.getTrackerResponse(
      user,
      tracker as Tracker & { createdByUser: User; modifiedByUser: User },
      query,
    );
    return trackerResponse;
  }

  async getGroupedEventsCount(params: CountQueryDto, groupBy?: CountGroup) {
    // console.log({ params });
    if (groupBy === CountGroup.status) {
      params['groupBy'] = ['status'] as CountGroup[];
      const data = await this.eventService.getEventsCount(params, false);
      // console.log({ getGroupedEventsCount121: data });

      return data;
    }
    if (groupBy === CountGroup.eventTypeGroup) {
      const [social, business, unattended] = await Promise.all([
        this.eventService.getEventsCount(
          {
            ...params,
            eventTypeGroup: 'social',
            groupBy: [CountGroup.eventTypeGroup],
          },
          false,
        ),
        this.eventService.getEventsCount(
          {
            ...params,
            eventTypeGroup: 'business',
            groupBy: [CountGroup.eventTypeGroup],
          },
          false,
        ),
        this.eventService.getEventsCount(
          {
            ...params,
            eventTypeGroup: 'unattended',
            groupBy: [CountGroup.eventTypeGroup],
          },
          false,
        ),
      ]);
      return {
        social: {
          total: social.count,
          new: social.new ?? 0,
        },
        business: {
          total: business.count,
          new: business.new ?? 0,
        },
        unattended: {
          total: unattended.count,
          new: unattended.new ?? 0,
        },
      };
    }
    if (
      params['searchByEntity'] &&
      params['searchByEntity'] === 'event' &&
      params.trackerId
    ) {
      // params['eventIds'] = [];
      params['eventSourceIds'] = '-1';
      await this.trackerDataService.bulkDeleteToSimilarTrackerEvent(
        params.trackerId,
      );
    }
    const data = await this.eventService.getEventsCount(params, false);
    return data;
  }

  async updateTracker(
    user: TCachedUser,
    trackerId: string,
    data: UpdateTrackerHttpDto,
  ) {
    const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
    ]);

    const updateParams = {
      ...data,
      id: tracker.id,
    };
    if (data.filterValues) {
      const nonEmptyParams = getNonEmptyParams(data.filterValues);
      const convertedParams = await this.sharedService.convertSlugParamsToIds(
        nonEmptyParams,
        true,
        false,
      );
      updateParams['filterValues'] = convertedParams;
    }

    if (tracker.type === 'T_EVENT_PARTICIPATION') {
      const [convertedParams] = await Promise.all([
        this.filterValueRestriction(updateParams['filterValues'] as any),
      ]);
    }
    const updatedTracker = await this.trackerDataService.updateTracker(
      user,
      updateParams,
    );
    try {
      await this.getIntelScoreForUpdate(trackerId, user);
    } catch (error) { }
    this.getTrackerResponse(
      user,
      updatedTracker as Tracker & { createdByUser: User; modifiedByUser: User },
      {
        refresh: true,
      },
    );
    return updatedTracker;
  }

  async deleteTracker(user: TCachedUser, trackerId: string) {
    const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
    ]);
    let addJobs: any = null;

    await Promise.all([
      this.redisService.del(`${trackerId}-IntelScore`),
      (async () => {
        addJobs = await this.redisService.get(`tracker-IntelScore-Jobs24`);
      })(),
    ]);
    if (!addJobs) {
      addJobs = [];
    }
    if (addJobs && !Array.isArray(addJobs)) {
      addJobs = !Array.isArray(addJobs) ? JSON.parse(addJobs) : addJobs;
    }
    addJobs = addJobs.filter((val) => val !== trackerId);
    await this.redisService.set(
      `tracker-IntelScore-Jobs24`,
      JSON.stringify([...new Set(addJobs)]),
      60 * 60 * 24 * 7,
    );
    return this.trackerDataService.updateTracker(user, {
      id: tracker.id,
      deleted: true,
    });
  }

  async getTrackerEvents(
    user: TCachedUser,
    trackerId: string,
    params: GetTrackerEventsDto,
    showValues: string,
  ) {
    try {
      const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
        'ADMIN',
        'SUPER_ADMIN',
        'USER',
      ]);
      console.log(tracker);
      const newParams = getNonEmptyParams(params);
      const convertedParams = await this.sharedService.convertSlugParamsToIds(
        newParams,
        true,
        false,
      );
      const { startDate, endDate } = this.getValidDateRange(
        tracker.filterValues as unknown as GetTrackerEventsDto,
        newParams as GetTrackerEventsDto,
      );
      convertedParams['active_gte'] = startDate;
      convertedParams['active_lte'] = endDate;
      if (params.trackerEventStatus && params.trackerEventStatus === 'new') {
        const lastActive = await this.lastActive(
          user,
          tracker.id,
          tracker.createdAt,
        );
        convertedParams['createdAt'] = lastActive.last_active_gte;
      }

      const searchByEntity = ['T_COMPETITOR', 'T_CUSTOMER_ICP'].includes(
        tracker.type,
      )
        ? 'company'
        : tracker.type === 'T_PEOPLE_FINDER'
          ? 'user'
          : tracker.type === 'T_SPEAKING_OPPORTUNITY'
            ? 'speaker'
            : tracker.type === 'T_RECRUITMENT'
              ? 'recruitment'
              : tracker.type === 'T_PRODUCT_KEYWORDS'
                ? 'keywords'
                : tracker.type === 'T_EVENT_PARTICIPATION'
                  ? 'event'
                  : undefined;
      if (tracker.type === 'T_EVENT_PARTICIPATION') {
        throw new HttpException('Invalid tracker type', HttpStatus.BAD_REQUEST);
      }
      if (
        searchByEntity &&
        searchByEntity === 'event' &&
        tracker.filterValues &&
        tracker.filterValues['eventIds']
      ) {
        tracker.filterValues['eventIds'] = [];
        tracker.filterValues['eventSourceIds'] = [-1];
      }
      if (
        tracker.filterValues &&
        tracker.filterValues['viewBound'] &&
        params.viewBound
      ) {
        const viewBounds = [
          JSON.stringify(tracker.filterValues['viewBound']),
          JSON.stringify(convertedParams.viewBound),
        ];
        convertedParams['viewBounds'] = viewBounds.join('<sep>');
        delete tracker.filterValues['viewBound'];
        delete convertedParams['viewBound'];
      }
      const eventParams = {
        ...(tracker.filterValues as Object),
        limit: params.limit,
        offset: params.offset,
        view: View.tracker,
        ...convertedParams,
        trackerId: trackerId,
        showValues: showValues,
      } as QueryDto;
      if (searchByEntity) {
        eventParams['searchByEntity'] = searchByEntity;
      }
      const events = await this.eventService.getAllEvents(
        eventParams,
        false,
        user,
      );
      return events;
    } catch (error) {
      if (
        error instanceof HttpException &&
        error.getStatus() === 400 &&
        error.getResponse() === 'Invalid date range'
      ) {
        if (params.view === 'calendar') {
          return {
            count: 0,
            events: {},
            countByMonth: params.calendar_type === 'month' ? {} : undefined,
            countByYear: params.calendar_type === 'year' ? {} : undefined,
          };
        }
        return {
          count: 0,
          events: [],
        };
      }
      throw error;
    }
  }

  async getTrackerSavedEvents(
    user: TCachedUser,
    trackerId: string,
    params: GetTrackerEventsDto,
    showValues: string,
  ) {
    try {
      const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
        'ADMIN',
        'SUPER_ADMIN',
        'USER',
      ]);
      const [savedEvents, count] = await Promise.all([
        this.intentDataService.getUserEventInterest({
          interest: ['BOOKMARK'],
          sourceModule: { in: ['TRACKER'] },
          sourceId: tracker.id,
          // interestedUserId: user.id,
          accountId: user.accountId,
          limit: params.limit,
          offset: params.offset,
        }),
        this.intentDataService.getUserEventInterestCountForBookmark({
          interest: ['BOOKMARK'],
          sourceModule: { in: ['TRACKER'] },
          sourceId: tracker.id,
          // interestedUserId: user.id,
          accountId: user.accountId,
          limit: params.limit,
          offset: params.offset,
        }),
      ]);

      const savedEventsIds = savedEvents.map((item) => item.eventId);

      if (savedEventsIds.length === 0) {
        return [];
      }

      const newParams = getNonEmptyParams(params);
      const convertedParams =
        await this.sharedService.convertSlugParamsToIds(newParams);

      const { startDate, endDate } = this.getValidDateRange(
        tracker.filterValues as unknown as GetTrackerEventsDto,
        newParams as GetTrackerEventsDto,
      );
      convertedParams['active_gte'] = startDate;
      convertedParams['active_lte'] = endDate;
      if (
        tracker.filterValues &&
        tracker.filterValues['viewBound'] &&
        params.viewBound
      ) {
        const viewBounds = [
          JSON.stringify(tracker.filterValues['viewBound']),
          JSON.stringify(convertedParams.viewBound),
        ];
        convertedParams['viewBounds'] = viewBounds.join('<sep>');
        delete tracker.filterValues['viewBound'];
        delete convertedParams['viewBound'];
      }
      if (params.trackerEventStatus && params.trackerEventStatus === 'new') {
        const lastActive = await this.lastActive(
          user,
          tracker.id,
          tracker.createdAt,
        );
        convertedParams['createdAt'] = lastActive.last_active_gte;
      }

      const eventParams = {
        eventIds: savedEventsIds,
        ...convertedParams,
        limit: params.limit,
        offset: 0,
        view: View.tracker,
        showValues: showValues,
      } as QueryDto;

      const events = await this.eventService.getAllEvents(
        eventParams,
        false,
        user,
      );

      return { ...events, count: count.length };
    } catch (error) {
      if (
        error instanceof HttpException &&
        error.getStatus() === 400 &&
        error.getResponse() === 'Invalid date range'
      ) {
        if (params.view === 'calendar') {
          return {
            count: 0,
            events: {},
            countByMonth: params.calendar_type === 'month' ? {} : undefined,
            countByYear: params.calendar_type === 'year' ? {} : undefined,
          };
        }
        return {
          count: 0,
          events: [],
        };
      }
      throw error;
    }
  }

  async getTrackerEventsCount(
    user: TCachedUser,
    trackerId: string,
    params: GetTrackerEventsCountDto,
  ) {
    try {
      const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
        'ADMIN',
        'SUPER_ADMIN',
        'USER',
      ]);
      const newParams = getNonEmptyParams(params);
      const convertedParams =
        await this.sharedService.convertSlugParamsToIds(newParams);
      const { startDate, endDate } = this.getValidDateRange(
        tracker.filterValues as unknown as GetTrackerEventsDto,
        newParams as GetTrackerEventsDto,
      );
      convertedParams['active_gte'] = startDate;
      convertedParams['active_lte'] = endDate;
      if (
        tracker.filterValues &&
        tracker.filterValues['viewBound'] &&
        params.viewBound
      ) {
        const viewBounds = [
          JSON.stringify(tracker.filterValues['viewBound']),
          JSON.stringify(convertedParams.viewBound),
        ];
        convertedParams['viewBounds'] = viewBounds.join('<sep>');
        delete tracker.filterValues['viewBound'];
        delete convertedParams['viewBound'];
      }
      if (params.trackerEventStatus && params.trackerEventStatus === 'new') {
        const lastActive = await this.lastActive(
          user,
          tracker.id,
          tracker.createdAt,
        );
        convertedParams['createdAt'] = lastActive.last_active_gte;
      }
      const searchByEntity = ['T_COMPETITOR', 'T_CUSTOMER_ICP'].includes(
        tracker.type,
      )
        ? 'company'
        : tracker.type === 'T_PEOPLE_FINDER'
          ? 'user'
          : tracker.type === 'T_SPEAKING_OPPORTUNITY'
            ? 'speaker'
            : tracker.type === 'T_RECRUITMENT'
              ? 'recruitment'
              : tracker.type === 'T_PRODUCT_KEYWORDS'
                ? 'keywords'
                : tracker.type === 'T_EVENT_PARTICIPATION'
                  ? 'event'
                  : undefined;
      if (
        searchByEntity &&
        searchByEntity === 'event' &&
        tracker.filterValues &&
        tracker.filterValues['eventIds']
      ) {
        tracker.filterValues['eventIds'] = [];
      }
      if (tracker.filterValues && tracker.filterValues['viewBound']) {
        tracker.filterValues['viewBound'] = tracker.filterValues['viewBound'];
      }
      const eventParams = {
        ...(tracker.filterValues as Object),
        ...convertedParams,
      } as CountQueryDto;

      if (searchByEntity) {
        eventParams['searchByEntity'] = searchByEntity;
      }

      const count = await this.eventService.getEventsCount(eventParams, false);

      return this.handleCountResponse(eventParams, count);
    } catch (error) {
      console.log({ error });
      if (
        error instanceof HttpException &&
        error.getStatus() === 400 &&
        error.getResponse() === 'Invalid date range'
      ) {
        if (
          params.groupBy &&
          [CountGroup.month, CountGroup.year, CountGroup.day].includes(
            params.groupBy[0],
          )
        ) {
          return {
            count: 0,
            events: {},
            countByMonth:
              params.groupBy[0] === CountGroup.month ? {} : undefined,
            countByYear: params.groupBy[0] === CountGroup.year ? {} : undefined,
          };
        } else if (
          params.groupBy &&
          ['city', 'state', 'country'].includes(params.groupBy[0])
        ) {
          return [];
        } else if (params.groupBy && params.groupBy[0] === CountGroup.status) {
          return {
            past: 0,
            active: 0,
            new: 0,
          };
        } else if (
          params.groupBy &&
          params.groupBy[0] === CountGroup.eventTypeGroup
        ) {
          return [
            {
              group_name: 'business',
              count: 0,
            },
            {
              group_name: 'social',
              count: 0,
            },
            {
              group_name: 'unattended',
              count: 0,
            },
          ];
        }
        return {
          count: 0,
        };
      }
      throw error;
    }
  }

  handleCountResponse(params: CountQueryDto, count: any) {
    console.log("countcountcount", count);
    if (
      params.groupBy &&
      ['city', 'state', 'country'].includes(params.groupBy[0]) &&
      !Array.isArray(count)
    ) {
      return [];
    }
    return count;
  }

  async getTrackerSavedEventsCount(
    user: TCachedUser,
    trackerId: string,
    params: GetTrackerEventsCountDto,
  ) {
    try {
      const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
        'ADMIN',
        'SUPER_ADMIN',
        'USER',
      ]);

      const savedEventsIds = (
        await this.intentDataService.getUserEventInterest({
          interest: ['BOOKMARK'],
          sourceModule: { in: ['TRACKER'] },
          sourceId: tracker.id,
          // interestedUserId: user.id,
          accountId: user.accountId,
        })
      ).map((item) => item.eventId);

      if (savedEventsIds.length === 0) {
        return [];
      }

      const newParams = getNonEmptyParams(params);
      const convertedParams =
        await this.sharedService.convertSlugParamsToIds(newParams);

      const { startDate, endDate } = this.getValidDateRange(
        tracker.filterValues as unknown as GetTrackerEventsDto,
        newParams as GetTrackerEventsDto,
      );
      convertedParams['active_gte'] = startDate;
      convertedParams['active_lte'] = endDate;
      if (
        tracker.filterValues &&
        tracker.filterValues['viewBound'] &&
        params.viewBound
      ) {
        const viewBounds = [
          JSON.stringify(tracker.filterValues['viewBound']),
          JSON.stringify(convertedParams.viewBound),
        ];
        convertedParams['viewBounds'] = viewBounds.join('<sep>');
        delete tracker.filterValues['viewBound'];
        delete convertedParams['viewBound'];
      }
      if (params.trackerEventStatus && params.trackerEventStatus === 'new') {
        const lastActive = await this.lastActive(
          user,
          tracker.id,
          tracker.createdAt,
        );
        convertedParams['createdAt'] = lastActive.last_active_gte;
      }

      const eventParams = {
        eventIds: savedEventsIds,
        ...convertedParams,
      } as CountQueryDto;
      const count = await this.eventService.getEventsCount(eventParams, false);
      return count;
    } catch (error) {
      if (
        error instanceof HttpException &&
        error.getStatus() === 400 &&
        error.getResponse() === 'Invalid date range'
      ) {
        if (
          params.groupBy &&
          [CountGroup.month, CountGroup.year, CountGroup.day].includes(
            params.groupBy[0],
          )
        ) {
          return {
            count: 0,
            events: {},
            countByMonth:
              params.groupBy[0] === CountGroup.month ? {} : undefined,
            countByYear: params.groupBy[0] === CountGroup.year ? {} : undefined,
          };
        } else if (
          params.groupBy &&
          ['city', 'state', 'country'].includes(params.groupBy[0])
        ) {
          return [];
        } else if (params.groupBy && params.groupBy[0] === CountGroup.status) {
          return {
            past: 0,
            active: 0,
            new: 0,
          };
        } else if (
          params.groupBy &&
          params.groupBy[0] === CountGroup.eventTypeGroup
        ) {
          return [
            {
              group_name: 'business',
              count: 0,
            },
            {
              group_name: 'social',
              count: 0,
            },
            {
              group_name: 'unattended',
              count: 0,
            },
          ];
        }
        return {
          count: 0,
        };
      }
      throw error;
    }
  }

  async getTrackerComments(
    user: TCachedUser,
    trackerId: string,
    params: GetTrackerCommentDto,
  ) {
    const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
      'USER',
    ]);
    const [data] = await Promise.all([
      this.commentService.getComments(
        {
          accountId: user.accountId,
          sourceModule: ['TRACKER'],
          sourceId: tracker.id,
          limit: params.limit,
          offset: params.offset,
        },
        user,
      ),
      // this.commentService.getCommentCount({
      //   accountId: user.accountId,
      //   sourceModule: 'TRACKER',
      //   sourceId: tracker.id,
      // }),
    ]);
    return CommentsResponseSchema.parse(data);
  }

  async getTrackerUsers(
    user: TCachedUser,
    trackerId: string,
    params: GetTrackerUsersDto,
  ) {
    const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
      'USER',
    ]);
    const resposeForAccessUser: { superAdmin: object[]; others: object[] } = {
      others: [],
      superAdmin: [],
    };
    const users = (
      await this.accessService.getAccess({
        sourceEntity: 'TRACKER',
        sourceEntityId: tracker.id,
        accountId: user.accountId,
        limit: params.limit,
        offset: params.offset,
        show: 'user',
      })
    ).map((item) => {
      const user = item.accessReceiver;
      if (item.accessType === 'SUPER_ADMIN') {
        resposeForAccessUser.superAdmin = [
          {
            id: user.id,
            name: getNameFromEmail(user.email, user.firstname, user.lastname),
            email: user.email,
            imageUrl: user.imageUrl,
            accessType: item.accessType,
            accessId: item.id,
          },
        ];
      } else if (['ADMIN', 'USER'].includes(item.accessType)) {
        resposeForAccessUser.others.push({
          id: user.id,
          name: getNameFromEmail(user.email, user.firstname, user.lastname),
          email: user.email,
          imageUrl: user.imageUrl,
          accessType: item.accessType,
          accessId: item.id,
        });
      }
    });
    return resposeForAccessUser;
  }

  async hasTrackerAccess(
    user: TCachedUser,
    trackerId: string,
    accessTypes: AccessType[],
  ): Promise<[Tracker, Record<string, any>]> {
    const trackers = await this.trackerDataService.getTrackers(
      {
        ids: [trackerId],
        accountId: user.accountId,
        limit: 1,
        offset: 0,
        // type: 'trackers',
      },
      user,
    );
    if (!trackers || (trackers && !trackers.length))
      throw new HttpException('Tracker not found', HttpStatus.NOT_FOUND);
    const tracker = trackers[0];
    const [hasAccess, result] = await this.accessService.hasAccess({
      accessReceiverId: user.id,
      accessTypes: accessTypes,
      sourceEntity: 'TRACKER',
      sourceEntityId: tracker.id,
      accountId: user.accountId,
      limit: 1,
      offset: 0,
    });
    if (!hasAccess) {
      if (result) throw new HttpException(result.message, result.status);
      else throw new HttpException('Invalid Access', HttpStatus.FORBIDDEN);
    }
    return [tracker, result];
  }

  getTrackerDates(created: Date, lastOpened?: Date) {
    if (lastOpened && lastOpened.valueOf() > created.valueOf()) {
      return lastOpened;
    }
    return created;
  }

  async lastActive(user: TCachedUser, trackerId: string, created: Date) {
    const lastRequest = await this.userDataService.getUserLastActivity(
      user,
      `/trackers/${trackerId}`,
    );
    const lastOpened = this.getTrackerDates(created, lastRequest?.createdAt);
    const currentDate = new Date(new Date().setHours(23, 59, 59, 999));
    const dateParams: LastActive = {
      last_active_lte: currentDate.toISOString(),
      last_active_gte: lastOpened.toISOString(),
    };
    return dateParams;
  }

  async createTrackerAccess(
    user: TCachedUser,
    trackerId: string,
    data: CreateAccessHttpDto,
  ) {
    if (
      (data.accessReceiverEmail && data.accessReceiverEmail === user.email) ||
      (data.accessReceiverId && data.accessReceiverId === user.id)
    ) {
      throw new HttpException(
        'Can not invite yourself',
        HttpStatus.BAD_REQUEST,
      );
    }
    const [tracker, access] = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
    ]);

    const accounts = await this.accountDataService.getAccounts({
      id: user.accountId,
      limit: 1,
      offset: 0,
    });
    if (!accounts || accounts.length === 0) {
      throw new HttpException(
        'Company account not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const account = accounts[0];
    if (account.domain && blackListDomain.includes(account.domain)) {
      throw new HttpException(
        'Can not invite user to this account',
        HttpStatus.BAD_REQUEST,
      );
    }
    const receiver = await this.userDataService.getUsers({
      ...(data.accessReceiverId && { ids: [data.accessReceiverId] }),
      ...(data.accessReceiverEmail && { email: [data.accessReceiverEmail] }),
      accountId: user.accountId,
      limit: 1,
      offset: 0,
    });

    if (receiver && receiver.length > 0) {
      const receiverAccess = await this.accessService.getAccess({
        accessReceiverId: receiver[0].id,
        accountId: user.accountId,
        sourceEntity: 'TRACKER',
        sourceEntityId: trackerId,
        limit: 1,
        offset: 0,
      });

      if (receiverAccess.length > 0) {
        throw new HttpException(
          'User already has access',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const hash = createHash('sha256').update(randomUUID()).digest('hex');
    const expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await this.accessService.createAccess(
      user,
      {
        ...data,
        sourceEntity: 'TRACKER',
        sourceEntityId: tracker.id,
        accessProviderId: user.id,
        accountId: user.accountId,
        redirectQueryParams: `targetId=${tracker.id}&target=tracker`,
        token: hash,
        expiry: expiry,
        redirectDomain: data.redirectDomain,
        flagForEmail: data.flagForEmail,
      },
      {
        trackerName: tracker.name,
        trackerType: tracker.type
      },
    );

    return { message: 'access provided successfully' };
  }

  async deleteTrackerAccess(
    user: TCachedUser,
    trackerId: string,
    accessId: string,
  ) {
    await this.hasTrackerAccess(user, trackerId, ['ADMIN', 'SUPER_ADMIN']);
    return this.accessService.deleteAccess(user, accessId);
  }

  async updateTrackerAccess(
    user: TCachedUser,
    trackerId: string,
    accessId: string,
    data: UpdateAccessHttpDto,
  ) {
    await this.hasTrackerAccess(user, trackerId, ['ADMIN', 'SUPER_ADMIN']);
    return this.accessService.updateAccess(user, accessId, data);
  }

  getValidDateRange(
    trackerFilterValues: GetTrackerEventsDto,
    params: GetTrackerEventsDto,
  ) {
    const trackerStartDate = trackerFilterValues.active_gte
      ? new Date(trackerFilterValues.active_gte).toISOString().split('T')[0]
      : undefined;
    const trackerEndDate = trackerFilterValues.active_lte
      ? new Date(trackerFilterValues.active_lte).toISOString().split('T')[0]
      : undefined;
    const paramsStartDate = params.active_gte
      ? new Date(params.active_gte).toISOString().split('T')[0]
      : undefined;
    const paramsEndDate = params.active_lte
      ? new Date(params.active_lte).toISOString().split('T')[0]
      : undefined;
    const type = params.trackerEventStatus;
    const today = new Date().toLocaleDateString('en-CA');
    const yesterday = new Date(
      new Date(today).valueOf() - 86400000,
    ).toLocaleDateString('en-CA');
    if (
      (paramsEndDate && trackerStartDate && paramsEndDate < trackerStartDate) ||
      (paramsStartDate && trackerEndDate && paramsStartDate > trackerEndDate) ||
      (type &&
        type === 'past' &&
        trackerStartDate &&
        trackerStartDate > yesterday) ||
      (type && type === 'active' && trackerEndDate && trackerEndDate < today)
    ) {
      throw new HttpException('Invalid date range', HttpStatus.BAD_REQUEST);
    }
    let userStartDate: string | undefined = undefined;
    let userEndDate: string | undefined = undefined;

    if (paramsStartDate && type === 'active') {
      userStartDate = new Date(
        Math.max(
          new Date(paramsStartDate).valueOf(),
          new Date(today).valueOf(),
        ),
      )
        .toISOString()
        .split('T')[0];
    } else if (type === 'active') {
      userStartDate = today;
    } else {
      userStartDate = paramsStartDate;
    }

    if (paramsEndDate && type === 'past') {
      userEndDate = new Date(
        Math.min(
          new Date(paramsEndDate).valueOf(),
          new Date(yesterday).valueOf(),
        ),
      )
        .toISOString()
        .split('T')[0];
    } else if (type === 'past') {
      userEndDate = yesterday;
    } else {
      userEndDate = paramsEndDate;
    }

    let startDate: string | undefined = undefined;
    let endDate: string | undefined = undefined;

    if (trackerStartDate && userStartDate) {
      startDate = new Date(
        Math.max(
          new Date(trackerStartDate).valueOf(),
          new Date(userStartDate).valueOf(),
        ),
      )
        .toISOString()
        .split('T')[0];
    } else {
      startDate = trackerStartDate || userStartDate;
    }

    if (trackerEndDate && userEndDate) {
      endDate = new Date(
        Math.min(
          new Date(trackerEndDate).valueOf(),
          new Date(userEndDate).valueOf(),
        ),
      )
        .toISOString()
        .split('T')[0];
    } else {
      endDate = trackerEndDate || userEndDate;
    }

    if (startDate && endDate && startDate > endDate) {
      throw new HttpException('Invalid date range', HttpStatus.BAD_REQUEST);
    }
    return { startDate, endDate };
  }
  async getTrackerSimilarEvents(
    user: TCachedUser,
    trackerId: string,
    params: GetTrackerEventsDto,
    showValues: string,
  ) {
    try {
      // console.log(params);

      const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
        'ADMIN',
        'SUPER_ADMIN',
        'USER',
      ]);
      console.log(tracker);

      const newParams = getNonEmptyParams(params);
      const convertedParams = await this.sharedService.convertSlugParamsToIds(
        newParams,
        true,
        false,
      );
      const { startDate, endDate } = this.getValidDateRange(
        tracker.filterValues as unknown as GetTrackerEventsDto,
        newParams as GetTrackerEventsDto,
      );
      convertedParams['active_gte'] = startDate;
      convertedParams['active_lte'] = endDate;
      if (params.trackerEventStatus && params.trackerEventStatus === 'new') {
        const lastActive = await this.lastActive(
          user,
          tracker.id,
          tracker.createdAt,
        );
        convertedParams['createdAt'] = lastActive.last_active_gte;
      }

      const searchByEntity = ['T_COMPETITOR', 'T_CUSTOMER_ICP'].includes(
        tracker.type,
      )
        ? 'company'
        : tracker.type === 'T_PEOPLE_FINDER'
          ? 'user'
          : tracker.type === 'T_SPEAKING_OPPORTUNITY'
            ? 'speaker'
            : tracker.type === 'T_RECRUITMENT'
              ? 'recruitment'
              : tracker.type === 'T_PRODUCT_KEYWORDS'
                ? 'keywords'
                : tracker.type === 'T_EVENT_PARTICIPATION'
                  ? 'event'
                  : undefined;
      if (tracker.type !== 'T_EVENT_PARTICIPATION') {
        throw new HttpException('Invalid tracker type', HttpStatus.BAD_REQUEST);
      }
      let eventParams = {
        ...(tracker.filterValues as Object),
        ...convertedParams,
        limit: params.limit,
        offset: params.offset,
        view: params.view || View.tracker,
        trackerId: trackerId,
        showValues: showValues,
      };
      const [dataFromDB, countFromDB] =
        await this.trackerDataService.getSimilarTrackerEvent(
          trackerId,
          eventParams['trackerEventStatus']
            ? [
              eventParams[
                'trackerEventStatus'
              ]?.toUpperCase() as TrackerTypeTag,
            ]
            : ['NEW', 'ACTIVE', 'PAST'],
          1000,
          0,
        );
      const countSimilarEventFromDB = Number(countFromDB[0].count);
      // console.log({ dataFromDB: countSimilarEventFromDB });

      if (countSimilarEventFromDB > 0) {
        // let count: number = dataFromDB[0]?.count||0;
        const cache: Object = {};
        eventParams['eventSourceIds'] = dataFromDB
          .map((val) => {
            cache[val.eventId] = val.score;
            return val.sourceId;
          })
          .join(',');
        if ((eventParams['eventSourceIds'] as string).length < 5) {
          eventParams['eventSourceIds'] = '-1';
        }
        eventParams['eventIds'] = [];
        eventParams['cache'] = JSON.stringify(cache);
        if (searchByEntity) {
          eventParams['searchByEntity'] = searchByEntity;
        }
        const events = await this.eventService.getSimilarEvents(eventParams);

        // console.dir(events, { depth: null });
        if (params.view === View.calendar || params.view === View.map) {
          return events;
        }
        let dataForResponse: object[] = [];
        dataFromDB.map((val) => {
          const findEVent = events.events.find(
            (value) => value.basic.id === val.eventId,
          );
          dataForResponse.push(findEVent);
        });
        dataForResponse = dataForResponse.filter((val) => val);
        // console.log(events);

        return { events: dataForResponse, count: events['count'] || 0 };
      } else {
        await this.trackerDataService.bulkDeleteToSimilarTrackerEvent(
          tracker.id,
        );
        this.getTrackerResponse(
          user,
          tracker as Tracker & { createdByUser: User; modifiedByUser: User },
          {
            refresh: true,
          },
        );
      }

      if (searchByEntity) {
        eventParams['searchByEntity'] = searchByEntity;
      }
      const events = await this.eventService.getSimilarEvents(eventParams);
      return events;
    } catch (error) {
      if (
        error instanceof HttpException &&
        error.getStatus() === 400 &&
        error.getResponse() === 'Invalid date range'
      ) {
        if (params.view === 'calendar') {
          return {
            count: 0,
            events: {},
            countByMonth: params.calendar_type === 'month' ? {} : undefined,
            countByYear: params.calendar_type === 'year' ? {} : undefined,
          };
        }
        return {
          count: 0,
          events: [],
        };
      }
      throw error;
    }
  }

  async getTrackerSimilarEventsCount(
    user: TCachedUser,
    trackerId: string,
    params: GetTrackerEventsCountDto,
  ) {
    try {
      // console.log(params);

      const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
        'ADMIN',
        'SUPER_ADMIN',
        'USER',
      ]);
      const newParams = getNonEmptyParams(params);
      const convertedParams = await this.sharedService.convertSlugParamsToIds(
        newParams,
        true,
        false,
      );
      const { startDate, endDate } = this.getValidDateRange(
        tracker.filterValues as unknown as GetTrackerEventsDto,
        newParams as GetTrackerEventsDto,
      );
      convertedParams['active_gte'] = startDate;
      convertedParams['active_lte'] = endDate;
      if (params.trackerEventStatus && params.trackerEventStatus === 'new') {
        const lastActive = await this.lastActive(
          user,
          tracker.id,
          tracker.createdAt,
        );
        convertedParams['createdAt'] = lastActive.last_active_gte;
      }

      const searchByEntity = ['T_COMPETITOR', 'T_CUSTOMER_ICP'].includes(
        tracker.type,
      )
        ? 'company'
        : tracker.type === 'T_PEOPLE_FINDER'
          ? 'user'
          : tracker.type === 'T_SPEAKING_OPPORTUNITY'
            ? 'speaker'
            : tracker.type === 'T_RECRUITMENT'
              ? 'recruitment'
              : tracker.type === 'T_PRODUCT_KEYWORDS'
                ? 'keywords'
                : tracker.type === 'T_EVENT_PARTICIPATION'
                  ? 'event'
                  : undefined;
      if (tracker.type !== 'T_EVENT_PARTICIPATION') {
        throw new HttpException('Invalid tracker type', HttpStatus.BAD_REQUEST);
      }
      let eventParams = {
        ...(tracker.filterValues as Object),
        ...convertedParams,
        trackerId: trackerId,
      } as CountQueryDto;
      const [dataFromDB, countFromDB] =
        await this.trackerDataService.getSimilarTrackerEvent(
          trackerId,
          eventParams['trackerEventStatus']
            ? [
              eventParams[
                'trackerEventStatus'
              ]?.toUpperCase() as TrackerTypeTag,
            ]
            : ['NEW', 'ACTIVE', 'PAST'],
          1000,
          0,
        );
      const countSimilarEventFromDB = Number(countFromDB[0].count);
      console.log(
        { dataFromDB: countSimilarEventFromDB },
        countSimilarEventFromDB,
      );

      if (searchByEntity) {
        eventParams['searchByEntity'] = searchByEntity;
      }
      if (countSimilarEventFromDB > 0) {
        // let count: number = dataFromDB[0]?.count||0;
        const cache: Object = {};
        eventParams['eventSourceIds'] = dataFromDB
          .map((val) => {
            cache[val.eventId] = val.score;
            return val.sourceId;
          })
          .join(',');
        eventParams['eventIds'] = [];
        if ((eventParams['eventSourceIds'] as string).length < 5) {
          eventParams['eventSourceIds'] = '-1';
        }
        const events =
          await this.eventService.getSimilarEventsCount(eventParams);
        // console.log("eventseventsevents", events);

        return { data: events };
      } else {
        await this.trackerDataService.bulkDeleteToSimilarTrackerEvent(
          tracker.id,
        );
        this.getTrackerResponse(
          user,
          tracker as Tracker & { createdByUser: User; modifiedByUser: User },
          {
            refresh: true,
          },
        );
      }
      const events = await this.eventService.getSimilarEventsCount(eventParams);
      // console.log("eventseventsevents", events);
      return { data: events };;
    } catch (error) {
      if (
        error instanceof HttpException &&
        error.getStatus() === 400 &&
        error.getResponse() === 'Invalid date range'
      ) {
        if (
          params.groupBy &&
          [CountGroup.month, CountGroup.year, CountGroup.day].includes(
            params.groupBy[0],
          )
        ) {
          return {
            count: 0,
            events: {},
            countByMonth:
              params.groupBy[0] === CountGroup.month ? {} : undefined,
            countByYear: params.groupBy[0] === CountGroup.year ? {} : undefined,
          };
        } else if (
          params.groupBy &&
          ['city', 'state', 'country'].includes(params.groupBy[0])
        ) {
          return [];
        } else if (params.groupBy && params.groupBy[0] === CountGroup.status) {
          return {
            past: 0,
            active: 0,
            new: 0,
          };
        } else if (
          params.groupBy &&
          params.groupBy[0] === CountGroup.eventTypeGroup
        ) {
          return [
            {
              group_name: 'business',
              count: 0,
            },
            {
              group_name: 'social',
              count: 0,
            },
            {
              group_name: 'unattended',
              count: 0,
            },
          ];
        }
        return {
          count: 0,
        };
      }
      throw error;
    }
  }
  async getTrackerIntelScore(
    user: TCachedUser,
    trackerId: string,
    query: GetTrackerIntelScoreDto,
    errorPass: boolean = true,
  ) {
    const MAX_FILTER_ITEMS = 100;

    const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
      'USER',
    ]);
    const trackerFilterValuesJson: Object = {
      ...(tracker.filterValues as unknown as object),
    };
    const queryForPayload = await this.createQueryForIntelScore(
      query,
      tracker,
      trackerId,
      user,
    );
    let [getJsonForTrackerType, jobsForIntelScore] = await Promise.all([
      this.redisService.jsonGet(
        `${trackerId}-IntelScore`,
        `$.${String(query.trackerEventStatus)}`,
      ),
      this.redisService.jsonGet(`${trackerId}-IntelScore-Job`),
    ]);
    const errorFunction = async () => {
      if (tracker.type !== 'T_EVENT_PARTICIPATION') {
        const jobExist = trackerId;
        let queueJobs: any | null =
          await this.redisService.get(`IntelScore-JobQueue`);
        // console.log({ queueJobs });
        if (!queueJobs) {
          queueJobs = [];
          await this.redisService.set(
            `IntelScore-JobQueue`,
            JSON.stringify([]),
            60 * 60 * 24 * 7,
          );
        }
        if (queueJobs && !Array.isArray(queueJobs))
          queueJobs = JSON.parse(queueJobs);
        queueJobs = !Array.isArray(queueJobs)
          ? JSON.parse(queueJobs)
          : queueJobs;
        queueJobs.push(jobExist);
        await this.redisService.set(
          `IntelScore-JobQueue`,
          JSON.stringify([...new Set(queueJobs)]),
          60 * 60 * 24 * 7,
        );
      }
      // try {
      throw new HttpException(
        'Unable to process the request right now,but request is raised',
        HttpStatus.ACCEPTED,
      );
      // } catch (error) {
      //   return error;
      // }
    };
    if (
      tracker.type === 'T_EVENT_PARTICIPATION' &&
      errorPass &&
      !getJsonForTrackerType
    ) {
      let length: number = 10000;
      if (length > MAX_FILTER_ITEMS) {
        return errorFunction();
      }
    }
    if (
      tracker.type === 'T_COMPETITOR' &&
      errorPass &&
      !getJsonForTrackerType
    ) {
      let length: number = 0;
      if (trackerFilterValuesJson['orgName']) {
        length += (trackerFilterValuesJson['orgName'] as string).split(
          ',',
        ).length;
      }
      if (trackerFilterValuesJson['orgWebsite']) {
        length += (trackerFilterValuesJson['orgWebsite'] as string).split(
          ',',
        ).length;
      }
      if (length > MAX_FILTER_ITEMS) {
        return errorFunction();
      }
    }
    if (
      tracker.type === 'T_PRODUCT_KEYWORDS' &&
      errorPass &&
      !getJsonForTrackerType
    ) {
      let length: number = 0;
      if (trackerFilterValuesJson['includeKeywords']) {
        length += (trackerFilterValuesJson['includeKeywords'] as string[])
          .length;
      }
      if (trackerFilterValuesJson['excludeKeywords']) {
        length += (trackerFilterValuesJson['excludeKeywords'] as string[])
          .length;
      }
      if (length > MAX_FILTER_ITEMS) {
        return errorFunction();
      }
    }
    if (
      (tracker.type === 'T_SPEAKING_OPPORTUNITY' ||
        tracker.type === 'T_PEOPLE_FINDER') &&
      errorPass &&
      !getJsonForTrackerType
    ) {
      let length: number = 0;
      if (trackerFilterValuesJson['userName']) {
        length += (trackerFilterValuesJson['userName'] as string).split(
          ',',
        ).length;
      }
      if (length > MAX_FILTER_ITEMS) {
        return errorFunction();
      }
    }
    let trackerEventsIntelScore: object[] = [];
    getJsonForTrackerType = getJsonForTrackerType
      ? JSON.parse(getJsonForTrackerType.toString())[0]
      : getJsonForTrackerType;
    // console.log(
    //   { getJsonForTrackerType: getJsonForTrackerType },
    //   { jobsForIntelScore },
    //   { data: await this.redisService.get(`${trackerId}-IntelScore-Job`) },
    // );

    if (
      !getJsonForTrackerType ||
      Object.keys(getJsonForTrackerType).length === 0
    ) {
      jobsForIntelScore = jobsForIntelScore
        ? JSON.parse(jobsForIntelScore.toString())[0]
        : jobsForIntelScore;
      let jobExist: TrackerIntelScoreJson | null | undefined =
        jobsForIntelScore as any;
      if (!jobExist) {
        jobExist = {
          trackerId,
          keywords: '<100',
          createdAt: new Date().toISOString(),
          status: 'pending',
          user: user,
        };
        const createTemplate = await Promise.all([
          this.redisService.jsonSet(
            `${trackerId}-IntelScore-Job`,
            '$',
            jobExist,
          ),
        ]);
        // console.log({ getJsonForTrackerType, sadas: 'SAdfsa' });
        this.fetchTrackerIntelScoreForCache(tracker, trackerId, user, jobExist);
      }
      const dataOfINtelScore =
        await this.trackerDataService.getTrackerIntelScoreFromApi(
          queryForPayload,
        );
      // console.log({ dataOfINtelScore });

      for (const eventId of query.eventIds.split(',')) {
        trackerEventsIntelScore.push(dataOfINtelScore[eventId]);
      }
    } else {
      const jsonTrackerType = getJsonForTrackerType[0];
      const eventIds = query.eventIds.split(',');
      for (const eventId of eventIds) {
        const data = await this.redisService.jsonGet(
          `${trackerId}-IntelScore`,
          `$.${String(query.trackerEventStatus)}.${eventId}`,
        );
        if (!data) {
          continue;
        }
        trackerEventsIntelScore.push(JSON.parse(data)[0] as any);
      }
      // const keys = eventIds.map((id) => `${trackerId}-IntelScore`);

      // const results = await this.redisService.jsonMget(
      //   `$.${query.trackerEventStatus}[${eventIds.join("\",\"")}]`,
      //   ...keys,
      // );
      // console.log((JSON.parse((results as string[])?.join('') || '{}')));

      // trackerEventsIntelScore = results
      //   .map((res) => (res ? JSON.parse(res)[0] : null)) // Get the root object from each Redis result
      //   .filter(Boolean) // Remove nulls
      //   .flatMap(
      //     (
      //       obj, // Flatten the nested eventId objects
      //     ) => Object.entries(obj).map(([uuid, data]) => data),
      //   ) as Object[];
      // for (const eventId of query.eventIds.split(',')) {
      //   console.log({ eventId });
      //   const intelscore: any | null | undefined = await this.redisService.jsonGet(`${trackerId}-IntelScore`, `$.${query.trackerEventStatus + '.' + eventId}`);
      //   console.log(({ outpppuy: JSON.parse(intelscore)[0] }));

      //   if (intelscore)
      //     trackerEventsIntelScore.push(JSON.parse(intelscore)[0]);
      // }
    }
    trackerEventsIntelScore = trackerEventsIntelScore.filter(
      (val) => val && Object.keys(val).length > 0,
    );
    // const unique = trackerEventsIntelScore.filter(
    //   (item, index, array) =>
    //     array.findIndex((i) => JSON.stringify(i) === JSON.stringify(item)) ===
    //     index,
    // );
    return { trackerEventsIntelScore };
  }
  async getTrackerIntelScoreForCron(
    user: TCachedUser,
    trackerId: string,
    query: GetTrackerIntelScoreDto,
    errorPass: boolean = true,
  ) {
    const MAX_FILTER_ITEMS = 100;

    const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
      'USER',
    ]);
    const trackerFilterValuesJson: Object = {
      ...(tracker.filterValues as unknown as object),
    };
    const queryForPayload = await this.createQueryForIntelScore(
      query,
      tracker,
      trackerId,
      user,
    );
    let [getJsonForTrackerType, jobsForIntelScore] = await Promise.all([
      this.redisService.jsonGet(
        `${trackerId}-IntelScore`,
        `$.${String(query.trackerEventStatus)}`,
      ),
      this.redisService.jsonGet(`${trackerId}-IntelScore-Job`),
    ]);
    let keywordsLength: number = 99;
    if (
      tracker.type === 'T_EVENT_PARTICIPATION' &&
      errorPass &&
      !getJsonForTrackerType
    ) {
      let length: number = 10000;
      if (length > MAX_FILTER_ITEMS) {
        keywordsLength = length;
      }
    }
    if (
      tracker.type === 'T_COMPETITOR' &&
      errorPass &&
      !getJsonForTrackerType
    ) {
      let length: number = 0;
      if (trackerFilterValuesJson['orgName']) {
        length += (trackerFilterValuesJson['orgName'] as string).split(
          ',',
        ).length;
      }
      if (trackerFilterValuesJson['orgWebsite']) {
        length += (trackerFilterValuesJson['orgWebsite'] as string).split(
          ',',
        ).length;
      }
      if (length > MAX_FILTER_ITEMS) {
        keywordsLength = length;
      }
    }
    if (
      tracker.type === 'T_PRODUCT_KEYWORDS' &&
      errorPass &&
      !getJsonForTrackerType
    ) {
      let length: number = 0;
      if (trackerFilterValuesJson['includeKeywords']) {
        length += (trackerFilterValuesJson['includeKeywords'] as string[])
          .length;
      }
      if (trackerFilterValuesJson['excludeKeywords']) {
        length += (trackerFilterValuesJson['excludeKeywords'] as string[])
          .length;
      }
      if (length > MAX_FILTER_ITEMS) {
        keywordsLength = length;
      }
    }
    if (
      (tracker.type === 'T_SPEAKING_OPPORTUNITY' ||
        tracker.type === 'T_PEOPLE_FINDER') &&
      errorPass &&
      !getJsonForTrackerType
    ) {
      let length: number = 0;
      if (trackerFilterValuesJson['userName']) {
        length += (trackerFilterValuesJson['userName'] as string).split(
          ',',
        ).length;
      }
      if (length > MAX_FILTER_ITEMS) {
        keywordsLength = length;
      }
    }
    let trackerEventsIntelScore: object[] = [];
    getJsonForTrackerType = getJsonForTrackerType
      ? JSON.parse(getJsonForTrackerType.toString())[0]
      : getJsonForTrackerType;
    // console.log(
    //   { getJsonForTrackerType: getJsonForTrackerType },
    //   { jobsForIntelScore },
    //   { data: await this.redisService.get(`${trackerId}-IntelScore-Job`) },
    // );

    let jobExist: TrackerIntelScoreJson = {
      trackerId,
      keywords: keywordsLength >= 100 ? '<100' : '>100',
      createdAt: new Date().toISOString(),
      status: 'pending',
      user: user,
    };
    const createTemplate = await Promise.all([
      this.redisService.jsonSet(`${trackerId}-IntelScore-Job`, '$', jobExist),
    ]);
    // console.log({ getJsonForTrackerType, sadas: 'SAdfsa' });
    await this.fetchTrackerIntelScoreForCache(
      tracker,
      trackerId,
      user,
      jobExist,
    );

    return { trackerEventsIntelScore: 'complete' };
  }
  async createQueryForIntelScore(
    query: any,
    tracker: any,
    trackerId: string,
    user: TCachedUser,
    validateIds: boolean = false,
  ) {
    const newParams = getNonEmptyParams(query);
    const convertedParams = await this.sharedService.convertSlugParamsToIds(
      newParams,
      true,
      false,
    );
    if (
      !newParams.eventTypes ||
      (newParams.eventTypes && newParams.eventTypes.length === 0)
    ) {
      const backend = process.env.BACKEND;
      if (backend && backend in defaultEventTypes) {
        if (validateIds) {
          newParams.eventTypes = Object.keys(defaultEventTypes[backend]);
        } else {
          newParams.eventTypes = Object.values(defaultEventTypes[backend]);
        }
      }
    }
    // console.log(newParams);
    const { startDate, endDate } = this.getValidDateRange(
      tracker.filterValues as unknown as GetTrackerEventsDto,
      newParams as GetTrackerEventsDto,
    );
    convertedParams['active_gte'] = startDate;
    convertedParams['active_lte'] = endDate;
    if (
      (query.trackerEventStatus && query.trackerEventStatus === 'new') ||
      (query['type'] && query['type'] === 'new')
    ) {
      const lastActive = await this.lastActive(
        user,
        tracker.id,
        tracker.createdAt,
      );
      convertedParams['createdAt'] = lastActive.last_active_gte.split('T')[0];
    }

    const searchByEntity = ['T_COMPETITOR', 'T_CUSTOMER_ICP'].includes(
      tracker.type,
    )
      ? 'company'
      : tracker.type === 'T_PEOPLE_FINDER'
        ? 'user'
        : tracker.type === 'T_SPEAKING_OPPORTUNITY'
          ? 'speaker'
          : tracker.type === 'T_RECRUITMENT'
            ? 'recruitment'
            : tracker.type === 'T_PRODUCT_KEYWORDS'
              ? 'keywords'
              : undefined;
    const showValues = 'basic,advance,insights,audience';
    const eventParams = {
      ...(tracker.filterValues as Object),
      view: View.tracker,
      ...convertedParams,
      trackerId: trackerId,
      showValues: showValues,
      trackerEventStatus: query['type'] || 'new',
    } as QueryDto;
    if (searchByEntity) {
      eventParams['searchByEntity'] = searchByEntity;
    }
    const cleanEventParams = Object.fromEntries(
      Object.entries(eventParams).filter(([_, value]) => value !== undefined),
    );
    delete cleanEventParams['type'];
    // console.log(cleanEventParams);

    return cleanEventParams;
  }
  async fetchTrackerIntelScoreForCache(
    tracker: any,
    trackerId: string,
    user: TCachedUser,
    job: TrackerIntelScoreJson,
  ) {
    try {
      job.status = 'processing';
      this.redisService.jsonSet(`${trackerId}-IntelScore-Job`, '$', job);

      const [active, newScore, past] = await Promise.all([
        this.fetchTrackerIntelScoreForActiveCache(tracker, trackerId, user),
        this.fetchTrackerIntelScoreForNewCache(tracker, trackerId, user),
        this.fetchTrackerIntelScoreForPastCache(tracker, trackerId, user),
      ]);

      const steCache = await this.redisService.jsonSet(
        `${trackerId}-IntelScore`,
        '$',
        {
          past,
          active,
          new: newScore,
        },
      );
      await this.redisService.expire(`${trackerId}-IntelScore`, 86400);
      // console.dir(
      //   {
      //     past,
      //     active,
      //     new: newScore,
      //     steCache,
      //   },
      //   { depth: null },
      // );

      let completedJobs: any | null = null;
      let addJobs: any | null = null;

      [completedJobs, addJobs] = await Promise.all([
        this.redisService.get('tracker-IntelScore-JobsComplete'),
        this.redisService.get('tracker-IntelScore-Jobs24'),
      ]);

      // console.log({ completedJobs });

      if (!completedJobs) {
        completedJobs = [];
        await this.redisService.set(
          `tracker-IntelScore-JobsComplete`,
          JSON.stringify([]),
          60 * 60 * 24 * 7,
        );
      }
      if (!addJobs) {
        addJobs = [];
      }
      job.status = 'complete';
      if (
        completedJobs &&
        !Array.isArray(completedJobs) &&
        JSON.parse(completedJobs).length > 100
      ) {
        completedJobs = !Array.isArray(completedJobs)
          ? JSON.parse(completedJobs).slice(-50)
          : completedJobs;
      }
      if (addJobs && !Array.isArray(addJobs)) {
        addJobs = !Array.isArray(addJobs) ? JSON.parse(addJobs) : addJobs;
      }
      completedJobs = !Array.isArray(completedJobs)
        ? JSON.parse(completedJobs).slice(-50)
        : completedJobs;
      addJobs.push(trackerId);
      completedJobs.push(job);
      await Promise.all([
        this.redisService.set(
          `tracker-IntelScore-JobsComplete`,
          JSON.stringify(completedJobs),
          60 * 60 * 24 * 7,
        ),
        this.redisService.set(
          `tracker-IntelScore-Jobs24`,
          JSON.stringify([...new Set(addJobs)]),
          60 * 60 * 24 * 7,
        ),
        this.redisService.del(`${trackerId}-IntelScore-Job`),
      ]);
    } catch (error) {
      // console.log(error);
      console.error(error);
      await this.redisService.del(`${trackerId}-IntelScore-Job`);
      await this.redisService.del(`${trackerId}-IntelScore`);
      await this.redisService.del(`tracker-IntelScore-JobsFailed`);
      let failedJobs: any | null = await this.redisService.get(
        `tracker-IntelScore-JobsFailed`,
      );
      // console.log({ failedJobs });

      if (!failedJobs) {
        failedJobs = [];
        await this.redisService.set(
          `tracker-IntelScore-JobsFailed`,
          JSON.stringify([]),
          60 * 60 * 24 * 7,
        );
      }
      job.status = 'failed';
      if (
        failedJobs &&
        !Array.isArray(failedJobs) &&
        JSON.parse(failedJobs).length > 100
      )
        failedJobs = JSON.parse(failedJobs).slice(-50);
      failedJobs = !Array.isArray(failedJobs)
        ? JSON.parse(failedJobs)
        : failedJobs;
      failedJobs.push(job);
      await this.redisService.set(
        `tracker-IntelScore-JobsFailed`,
        JSON.stringify(failedJobs),
        60 * 60 * 24 * 7,
      );
    }
  }
  async fetchTrackerIntelScoreForActiveCache(
    tracker: any,
    trackerId: string,
    user: TCachedUser,
  ) {
    const queryForPayload = await this.createQueryForIntelScore(
      { type: 'active' },
      tracker,
      trackerId,
      user,
    );
    const dataOfINtelScore =
      await this.trackerDataService.getTrackerIntelScoreFromApi(
        queryForPayload,
      );
    if (dataOfINtelScore['error'] || dataOfINtelScore['statusCode']) {
      return {};
    }
    return dataOfINtelScore;
  }
  async fetchTrackerIntelScoreForNewCache(
    tracker: any,
    trackerId: string,
    user: TCachedUser,
  ) {
    const queryForPayload = await this.createQueryForIntelScore(
      { type: 'new' },
      tracker,
      trackerId,
      user,
    );
    const dataOfINtelScore =
      await this.trackerDataService.getTrackerIntelScoreFromApi(
        queryForPayload,
      );
    if (dataOfINtelScore['error'] || dataOfINtelScore['statusCode']) {
      return {};
    }
    return dataOfINtelScore;
  }
  async fetchTrackerIntelScoreForPastCache(
    tracker: any,
    trackerId: string,
    user: TCachedUser,
  ) {
    const queryForPayload = await this.createQueryForIntelScore(
      { type: 'past' },
      tracker,
      trackerId,
      user,
    );
    const dataOfINtelScore =
      await this.trackerDataService.getTrackerIntelScoreFromApi(
        queryForPayload,
      );
    if (dataOfINtelScore['error'] || dataOfINtelScore['statusCode']) {
      return {};
    }
    return dataOfINtelScore;
  }
  async getIntelScoreForUpdate(trackerId: string, user: TCachedUser) {
    const MAX_FILTER_ITEMS = 100;

    const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
      'USER',
    ]);
    const trackerFilterValuesJson: Object = {
      ...(tracker.filterValues as unknown as object),
    };
    // const queryForPayload = await this.createQueryForIntelScore(
    //   tracker,
    //   trackerId,
    //   user,
    // );
    let [getJsonForTrackerType, jobsForIntelScore] = await Promise.all([
      this.redisService.jsonGet(`${trackerId}-IntelScore`, `$.${'acitve'}`),
      this.redisService.jsonGet(`${trackerId}-IntelScore-Job`),
    ]);
    const errorFunction = async () => {
      if (tracker.type !== 'T_EVENT_PARTICIPATION') {
        const jobExist = trackerId;
        let queueJobs: any | null =
          await this.redisService.get(`IntelScore-JobQueue`);
        // console.log({ queueJobs });
        if (!queueJobs) {
          queueJobs = [];
          await this.redisService.set(
            `IntelScore-JobQueue`,
            JSON.stringify([]),
            60 * 60 * 24 * 7,
          );
        }
        if (queueJobs && !Array.isArray(queueJobs))
          queueJobs = JSON.parse(queueJobs);
        queueJobs = !Array.isArray(queueJobs)
          ? JSON.parse(queueJobs)
          : queueJobs;
        queueJobs.push(jobExist);
        await this.redisService.set(
          `IntelScore-JobQueue`,
          JSON.stringify([...new Set(queueJobs)]),
          60 * 60 * 24 * 7,
        );
      }
      // try {
      return {};
      // } catch (error) {
      //   return error;
      // }
    };
    if (tracker.type === 'T_EVENT_PARTICIPATION' && !getJsonForTrackerType) {
      let length: number = 10000;
      if (length > MAX_FILTER_ITEMS) {
        return errorFunction();
      }
    }
    if (tracker.type === 'T_COMPETITOR' && !getJsonForTrackerType) {
      let length: number = 0;
      if (trackerFilterValuesJson['orgName']) {
        length += (trackerFilterValuesJson['orgName'] as string).split(
          ',',
        ).length;
      }
      if (trackerFilterValuesJson['orgWebsite']) {
        length += (trackerFilterValuesJson['orgWebsite'] as string).split(
          ',',
        ).length;
      }
      if (length > MAX_FILTER_ITEMS) {
        return errorFunction();
      }
    }
    if (tracker.type === 'T_PRODUCT_KEYWORDS' && !getJsonForTrackerType) {
      let length: number = 0;
      if (trackerFilterValuesJson['includeKeywords']) {
        length += (trackerFilterValuesJson['includeKeywords'] as string[])
          .length;
      }
      if (trackerFilterValuesJson['excludeKeywords']) {
        length += (trackerFilterValuesJson['excludeKeywords'] as string[])
          .length;
      }
      if (length > MAX_FILTER_ITEMS) {
        return errorFunction();
      }
    }
    if (
      (tracker.type === 'T_SPEAKING_OPPORTUNITY' ||
        tracker.type === 'T_PEOPLE_FINDER') &&
      !getJsonForTrackerType
    ) {
      let length: number = 0;
      if (trackerFilterValuesJson['userName']) {
        length += (trackerFilterValuesJson['userName'] as string).split(
          ',',
        ).length;
      }
      if (length > MAX_FILTER_ITEMS) {
        return errorFunction();
      }
    }
    jobsForIntelScore = jobsForIntelScore
      ? JSON.parse(jobsForIntelScore.toString())[0]
      : jobsForIntelScore;
    let jobExist: TrackerIntelScoreJson | null | undefined =
      jobsForIntelScore as any;
    if (!jobExist) {
      jobExist = {
        trackerId,
        keywords: '<100',
        createdAt: new Date().toISOString(),
        status: 'pending',
        user: user,
      };
      const createTemplate = await Promise.all([
        this.redisService.jsonSet(`${trackerId}-IntelScore-Job`, '$', jobExist),
      ]);
      // console.log({ getJsonForTrackerType, sadas: 'SAdfsa' });
      await this.fetchTrackerIntelScoreForCache(
        tracker,
        trackerId,
        user,
        jobExist,
      );
    }
  }
  async createTrackerEventDataExported(
    trackerId: string,
    user: TCachedUser,
    body: CreateTrackerExportsDto,
  ) {
    const [trackerData, membershipStatus] = await Promise.all([this.getTracker(user, trackerId, {}), 
      this.sharedService.getAccountMemberShipStatus(user.accountId)]);
    if (!membershipLimit[membershipStatus.membership].exportAllowed) {
      throw new HttpException(
        `Your current membership (${membershipStatus.membership}) does not allow data export.`,
        HttpStatus.FORBIDDEN,
      );
    }
    const allowerUserForExport: string[] = [
      ...JSON.parse(process.env.TRACKER_EXPORT_USERS_FULL_ACCESS || ''),
      ...JSON.parse(process.env.TRACKER_EXPORT_USERS_LIMITED_ACCESS || ''),
    ];
    if (!allowerUserForExport.includes(user.email)) {
      throw new HttpException(
        'Invalid export request by user',
        HttpStatus.FORBIDDEN,
      );
    }
    const trackerEventTypeMappingObj: object = {
      new: 'exportIdNew',
      active: 'exportIdActive',
      past: 'exportIdPast',
      business: 'exportIdBusiness',
      social: 'exportIdSocial',
      unattended: 'exportIdUnattended',
      exportIdNew: 'TRACKER_NEW_EVENT',
      exportIdPast: 'TRACKER_PAST_EVENT',
      exportIdActive: 'TRACKER_ACTIVE_EVENT',
      exportIdBusiness: 'TRACKER_BUSINESS_EVENT',
      exportIdSocial: 'TRACKER_SOCIAL_EVENT',
      exportIdUnattended: 'TRACKER_UNATTENDED_EVENT',
    };
    const trackerTypeGTM: string[] = ['past', 'active', 'new'];
    const trackerTypeGEO: string[] = ['business', 'social', 'unattended'];
    const payload: trackerExportDto = {
      userData: user,
      type: body.type,
      source: 'TRACKER',
      sourceId: trackerId,
      trackerId: trackerData.id,
      redirectUrl:
        body.redirectUrl + `&targetId=${trackerData.id}&target=tracker`,
    };
    if (body.type === 'all') {
      if (process.env.BACKEND === 'gtm') {
        for (const val of trackerTypeGTM) {
          const key = trackerEventTypeMappingObj[val];
          const exportOf = trackerEventTypeMappingObj[key] as ExportSubSource;
          const result = await this.trackerDataService.createExport(
            {
              exportOf,
              inputData: { ...payload, trackerData: trackerData },
              trackerId: trackerData.id,
            },
            user,
          );
          payload[key] = result.id;
        }
      } else {
        for (const val of trackerTypeGEO) {
          const key = trackerEventTypeMappingObj[val];
          const exportOf = trackerEventTypeMappingObj[key] as ExportSubSource;
          const result = await this.trackerDataService.createExport(
            {
              exportOf,
              inputData: { ...payload, trackerData: trackerData },
              trackerId: trackerData.id,
            },
            user,
          );
          payload[key] = result.id;
        }
      }
    } else {
      payload[trackerEventTypeMappingObj[body.type]] = (
        await this.trackerDataService.createExport(
          {
            exportOf: trackerEventTypeMappingObj[
              trackerEventTypeMappingObj[body.type]
            ] as ExportSubSource,
            inputData: payload,
            trackerId: trackerData.id,
          },
          user,
        )
      ).id;
    }
    // console.log(payload);

    await this.trackerDataService.createTrackerExportJob(payload, user.id);
    return { data: { message: 'Export initiated successfully' } };
  }
  async getTrackerEventDataExported(
    trackerId: string,
    user: TCachedUser,
    query: LimitDto,
  ) {
    const trackerData = await this.getTracker(user, trackerId, {});
    const allowerUserForExport: string[] = [
      ...JSON.parse(process.env.TRACKER_EXPORT_USERS_FULL_ACCESS || ''),
      ...JSON.parse(process.env.TRACKER_EXPORT_USERS_LIMITED_ACCESS || ''),
    ];
    if (!allowerUserForExport.includes(user.email)) {
      throw new HttpException(
        'Invalid export request by user',
        HttpStatus.FORBIDDEN,
      );
    }
    const [trackerExports, count] = await Promise.all([
      this.trackerDataService.getTrackerExport(trackerId, user, query),
      this.trackerDataService.getTrackerExportCount(trackerId, user, query),
    ]);
    return {
      trackerExports: trackerExports.trackerExports,
      count: count.count,
    };
  }
  async deleteTrackerEventDataExported(
    trackerId: string,
    exportId: string,
    user: TCachedUser,
  ) {
    const trackerData = await this.getTracker(user, trackerId, {});
    const allowerUserForExport: string[] = [
      ...JSON.parse(process.env.TRACKER_EXPORT_USERS_FULL_ACCESS || ''),
      ...JSON.parse(process.env.TRACKER_EXPORT_USERS_LIMITED_ACCESS || ''),
    ];
    if (!allowerUserForExport.includes(user.email)) {
      throw new HttpException(
        'Invalid export request by user',
        HttpStatus.FORBIDDEN,
      );
    }
    await this.trackerDataService.deleteTrackerExport(exportId);
    return { message: 'export deleted successfully' };
  }
}
// getTrackerEventDataExported
