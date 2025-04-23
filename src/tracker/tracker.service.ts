import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { TrackerDataService } from './tracker.data.service';
import { blackListDomain, LastActive, TCachedUser } from 'src/utils/types';
import {
  CreateTrackerDto,
  GetTrackerByIdDto,
  GetTrackerCommentDto,
  GetTrackerEventsCountDto,
  GetTrackerEventsDto,
  GetTrackersHttpDto,
  GetTrackerUsersDto,
  UpdateTrackerHttpDto,
} from './dto';
import { AccessService } from 'src/access/access.service';
import { AccessDataService } from 'src/access/access.data.service';
import { getNameFromEmail, getNonEmptyParams } from 'src/utils';
import { SharedService } from 'src/shared/shared.service';
import { EventsService } from 'src/events/events.service';
import { CountGroup, CountQueryDto, QueryDto, View } from 'src/events/dto';
import { IntentDataService } from 'src/intent/intent.data.service';
import { AccessType, Prisma, Tracker, User } from '@prisma/client';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { UserDataService } from 'src/user/user.data.service';
import { CommentService } from 'src/comment/comment.service';
import { CreateAccessHttpDto, UpdateAccessHttpDto } from 'src/access/dto';
import { createHash, randomUUID } from 'crypto';
import { CommentsResponseSchema } from 'src/comment/dto/response';
import { ConfigService } from '@nestjs/config';
import { QueryFilter, QueryFilterDto } from 'src/events/dto/query.dto';
import { AccountDataService } from 'src/user/account/account.data.service';
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
  ) {}

  async createTracker(user: TCachedUser, data: CreateTrackerDto) {
    const nonEmptyParams = getNonEmptyParams(data.filterValues);
    const convertedParams = await this.sharedService.convertSlugParamsToIds(
      nonEmptyParams,
      true,
      false,
    );
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
    });
    this.getTrackerResponse(
      user,
      tracker as Tracker & { createdByUser: User; modifiedByUser: User },
      {
        refresh: true,
      },
    );
    return tracker;
  }

  async getTrackerResponse(
    user: TCachedUser,
    tracker: Tracker & { createdByUser: User; modifiedByUser: User },
    query: GetTrackerByIdDto,
  ) {
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
          : undefined;
    tracker.filterValues = tracker.filterValues
      ? {
          ...(tracker.filterValues as Record<string, any>),
          searchByEntity,
        }
      : { searchByEntity };

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
    let cachedValues = (await this.cacheManager.get(tracker.id)) as {
      groupedEventsCount: object;
      filterValues: object;
    };
    let { groupedEventsCount, filterValues } = cachedValues ?? {};
    if (
      (!groupedEventsCount && !tracker.type.startsWith('TR_')) ||
      !filterValues ||
      query.refresh
    ) {
      if (!tracker.type.startsWith('TR_')) {
        groupedEventsCount = await this.getGroupedEventsCount(
          {
            ...tracker.filterValues,
            createdAt: lastActive.last_active_gte,
          } as CountQueryDto,
          groupBy ? groupBy : undefined,
          // groupBy,
        );
      }

      filterValues = await this.sharedService.convertIdParamsToSlug(
        tracker.filterValues,
      );
      await this.cacheManager.set(
        tracker.id,
        { groupedEventsCount, filterValues: tracker.filterValues },
        82800000,
      );
    }
    const trackerValues = {
      id: tracker.id,
      name: tracker.name,
      type: tracker.type,
      filterValues: filterValues,
      createdAt: tracker.createdAt,
      updatedAt: tracker.updatedAt,
      createdBy: {
        id: tracker.createdByUser.id,
        name: getNameFromEmail(
          tracker.createdByUser.email,
          tracker.createdByUser.firstname,
          tracker.createdByUser.lastname,
        ),
        email: tracker.createdByUser.email,
        imageUrl: tracker.createdByUser.imageUrl,
      },
      lastModifiedBy:
        tracker.modifiedByUser && tracker.modifiedByUser.id
          ? {
              id: tracker.modifiedByUser.id,
              name: getNameFromEmail(
                tracker.modifiedByUser.email,
                tracker.modifiedByUser.firstname,
                tracker.modifiedByUser.lastname,
              ),
              email: tracker.modifiedByUser.email,
              imageUrl: tracker.modifiedByUser.imageUrl,
            }
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
    if (groupBy === CountGroup.status) {
      params['groupBy'] = ['status'] as CountGroup[];
      const data = await this.eventService.getEventsCount(params, false);
      return data.count;
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
    const data = await this.eventService.getEventsCount(params, false);
    return data.count;
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
    const updatedTracker = await this.trackerDataService.updateTracker(
      user,
      updateParams,
    );
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
                : undefined;

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
              : undefined;
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
          sourceModule: 'TRACKER',
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
      },
      {
        trackerName: tracker.name,
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
}
