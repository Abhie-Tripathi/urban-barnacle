import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { TrackerDataService } from './tracker.data.service';
import { LastActive, TCachedUser } from 'src/utils/types';
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
import { AccessType, Prisma, Tracker } from '@prisma/client';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { UserDataService } from 'src/user/user.data.service';
import { CommentService } from 'src/comment/comment.service';
import { CreateAccessHttpDto, UpdateAccessHttpDto } from 'src/access/dto';
import { createHash, randomUUID } from 'crypto';
import { CommentsResponseSchema } from 'src/comment/dto/response';
import { ConfigService } from '@nestjs/config';

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
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) { }

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
    return tracker;
  }

  async getTrackerResponse(
    user: TCachedUser,
    tracker: Tracker,
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
        sourceModule: 'TRACKER',
        sourceId: tracker.id,
        interestedUserId: user.id,
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
    if (!groupedEventsCount || !filterValues || query.refresh) {
      groupedEventsCount = await this.getGroupedEventsCount(
        {
          ...tracker.filterValues,
          createdAt: lastActive.last_active_gte,
          ...(groupBy ? { groupBy: [groupBy] } : {}),
        } as CountQueryDto,
        groupBy ? groupBy : undefined,
        // groupBy,
      );

      tracker.filterValues = await this.sharedService.convertIdParamsToSlug(
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
      filterValues: tracker.filterValues,
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
        const trackerResponse = this.getTrackerResponse(user, tracker, {
          refresh: params.refresh,
        });
        return trackerResponse;
      }),
    );
    return allTrackers;
  }

  async getTrackersCount(user: TCachedUser, params: GetTrackersHttpDto) {
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
    const trackerResponse = await this.getTrackerResponse(user, tracker, query);
    return trackerResponse;
  }

  async getGroupedEventsCount(params: CountQueryDto, groupBy?: CountGroup) {
    const data = await this.eventService.getEventsCount(params, false);
    if (!groupBy) return data.count;
    if (groupBy === CountGroup.status) {
      return data.count;
    } else if (groupBy === CountGroup.eventTypeGroup) {
      return data.reduce((acc, curr) => {
        acc[curr.group_name] = {
          total: curr.count,
          new: curr.new ?? 0,
        };
        return acc;
      }, {});
    }
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
    return await this.trackerDataService.updateTracker(user, updateParams);
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
  ) {
    const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
      'USER',
    ]);
    const newParams = getNonEmptyParams(params);
    const convertedParams =
      await this.sharedService.convertSlugParamsToIds(newParams);
    if (params.trackerEventStatus && params.trackerEventStatus === 'past') {
      convertedParams['active_lte'] = tracker.filterValues
        ? new Date(
          Math.min(
            new Date(
              tracker.filterValues['active_lte'] || new Date(),
            ).valueOf(),
            new Date().valueOf(),
          ),
        ).toISOString()
        : new Date().toISOString();
    } else if (
      params.trackerEventStatus &&
      params.trackerEventStatus === 'active'
    ) {
      convertedParams['active_gte'] = tracker.filterValues
        ? new Date(
          Math.max(
            new Date(
              tracker.filterValues['active_gte'] || new Date(),
            ).valueOf(),
            new Date().valueOf(),
          ),
        ).toISOString()
        : new Date().toISOString();
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
            : undefined;

    const eventParams = {
      ...(tracker.filterValues as Object),
      limit: params.limit,
      offset: params.offset,
      view: View.tracker,
      ...convertedParams,
      trackerId: trackerId,
    } as QueryDto;
    if (searchByEntity) {
      eventParams['searchByEntity'] = searchByEntity;
      eventParams.offset = 0;
    }
    const events = await this.eventService.getAllEvents(
      eventParams,
      false,
      user,
    );
    return events;
  }

  async getTrackerSavedEvents(
    user: TCachedUser,
    trackerId: string,
    params: GetTrackerEventsDto,
  ) {
    const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
      'USER',
    ]);
    const savedEventsIds = (
      await this.intentDataService.getUserEventInterest({
        interest: ['BOOKMARK'],
        sourceModule: 'TRACKER',
        sourceId: tracker.id,
        // interestedUserId: user.id,
        accountId: user.accountId,
        limit: params.limit,
        offset: params.offset,
      })
    ).map((item) => item.eventId);

    if (savedEventsIds.length === 0) {
      return [];
    }

    const newParams = getNonEmptyParams(params);
    const convertedParams =
      await this.sharedService.convertSlugParamsToIds(newParams);
    const eventParams = {
      eventIds: savedEventsIds,
      ...convertedParams,
      limit: params.limit,
      offset: 0,
      view: View.tracker,
    } as QueryDto;

    const events = await this.eventService.getAllEvents(eventParams, false);

    return events;
  }

  async getTrackerEventsCount(
    user: TCachedUser,
    trackerId: string,
    params: GetTrackerEventsCountDto,
  ) {
    const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
      'USER',
    ]);
    const newParams = getNonEmptyParams(params);
    const convertedParams =
      await this.sharedService.convertSlugParamsToIds(newParams);
    if (params.type && params.type === 'past') {
      convertedParams['active_lte'] = tracker.filterValues
        ? new Date(
          Math.min(
            new Date(
              tracker.filterValues['active_lte'] || new Date(),
            ).valueOf(),
            new Date().valueOf(),
          ),
        ).toISOString()
        : new Date().toISOString();
    } else if (params.type && params.type === 'active') {
      convertedParams['active_gte'] = tracker.filterValues
        ? new Date(
          Math.max(
            new Date(
              tracker.filterValues['active_gte'] || new Date(),
            ).valueOf(),
            new Date().valueOf(),
          ),
        ).toISOString()
        : new Date().toISOString();
    }
    if (params.type && params.type === 'new') {
      const lastActive = await this.lastActive(
        user,
        tracker.id,
        tracker.createdAt,
      );
      convertedParams['createdAt'] = lastActive.last_active_gte;
    }
    if (tracker.filterValues && tracker.filterValues['viewBound']) {
      tracker.filterValues['viewBound'] = tracker.filterValues['viewBound'];
    }
    const eventParams = {
      ...(tracker.filterValues as Object),
      ...convertedParams,
    } as CountQueryDto;

    const count = await this.eventService.getEventsCount(eventParams, false);
    return count;
  }

  async getTrackerSavedEventsCount(
    user: TCachedUser,
    trackerId: string,
    params: GetTrackerEventsCountDto,
  ) {
    const [tracker, result] = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
      'USER',
    ]);

    const savedEventsIds = (
      await this.intentDataService.getUserEventInterest({
        interest: ['BOOKMARK'],
        sourceModule: 'TRACKER',
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
    const eventParams = {
      eventIds: savedEventsIds,
      ...convertedParams,
    } as CountQueryDto;
    const count = await this.eventService.getEventsCount(eventParams, false);
    return count;
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
    const tracker = (
      await this.trackerDataService.getTrackers(
        {
          ids: [trackerId],
          accountId: user.accountId,
          limit: 1,
          offset: 0,
          type: 'trackers',
        },
        user,
      )
    )[0];
    if (!tracker)
      throw new HttpException('Tracker not found', HttpStatus.NOT_FOUND);
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
    const [tracker, access] = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
    ]);

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
}
