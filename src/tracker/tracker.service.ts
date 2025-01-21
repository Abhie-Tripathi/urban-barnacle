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
import { getNonEmptyParams } from 'src/utils';
import { SharedService } from 'src/shared/shared.service';
import { EventsService } from 'src/events/events.service';
import { CountGroup, CountQueryDto, QueryDto } from 'src/events/dto';
import { IntentDataService } from 'src/intent/intent.data.service';
import { AccessType, Prisma, Tracker } from '@prisma/client';
import { CommentDataService } from 'src/comment/comment.data.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { UserDataService } from 'src/user/user.data.service';

@Injectable()
export class TrackerService {
  constructor(
    private readonly trackerDataService: TrackerDataService,
    private readonly accessDataService: AccessDataService,
    private readonly accessService: AccessService,
    private readonly sharedService: SharedService,
    private readonly eventService: EventsService,
    private readonly intentDataService: IntentDataService,
    private readonly commentDataService: CommentDataService,
    private readonly userDataService: UserDataService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async createTracker(user: TCachedUser, data: CreateTrackerDto) {
    const nonEmptyParams = getNonEmptyParams(data.filterValue);
    const convertedParams =
      await this.sharedService.convertSlugParamsToIds(nonEmptyParams);
    const tracker = await this.trackerDataService.createTracker(user, {
      ...data,
      filterValue: convertedParams,
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

    const searchByEntity =
      tracker.type === 'T_COMPETITOR'
        ? 'company'
        : tracker.type === 'T_PEOPLE_FINDER'
          ? 'user'
          : tracker.type === 'T_SPEAKING_OPPORTUNITY'
            ? 'speaker'
            : undefined;
    tracker.filterValue = tracker.filterValue
      ? {
          ...(tracker.filterValue as Record<string, any>),
          searchByEntity,
        }
      : { searchByEntity };

    const savedEventsCount =
      await this.intentDataService.getUserEventInterestCount({
        interest: 'BOOKMARK',
        sourceModule: 'TRACKER',
        sourceId: tracker.id,
        interestedUserId: user.id,
        accountId: user.accountId,
      });
    const groupBy = searchByEntity
      ? CountGroup.status
      : CountGroup.eventTypeGroup;
    let cachedValues = (await this.cacheManager.get(tracker.id)) as {
      groupedEventsCount: object;
      filterValue: object;
    };
    let { groupedEventsCount, filterValue } = cachedValues ?? {};

    if (!groupedEventsCount || !filterValue || query.refresh) {
      groupedEventsCount = await this.getGroupedEventsCount(
        {
          ...tracker.filterValue,
          createdAt: lastActive.last_active_gte,
          groupBy: [groupBy],
        } as CountQueryDto,
        groupBy,
      );

      tracker.filterValue = await this.sharedService.convertIdParamsToSlug(
        tracker.filterValue,
      );

      await this.cacheManager.set(
        tracker.id,
        { groupedEventsCount, filterValue: tracker.filterValue },
        82800000,
      );
    }
    const trackerValues = {
      id: tracker.id,
      name: tracker.name,
      type: tracker.type,
      filterValue: tracker.filterValue,
    };
    return {
      ...trackerValues,
      groupedEventsCount,
      savedEventsCount,
    };
  }

  async getTrackers(user: TCachedUser, params: GetTrackersHttpDto) {
    const trackerIds = (
      await this.accessService.getAccess({
        accessReceiverId: user.id,
        accountId: user.accountId,
        sourceEntity: 'TRACKER',
        accessTypes:
          params.createdBy === 'me'
            ? ['SUPER_ADMIN']
            : params.createdBy === 'others'
              ? ['ADMIN', 'USER']
              : ['SUPER_ADMIN', 'ADMIN', 'USER'],
        limit: params.limit,
        offset: params.offset,
      })
    ).map((access) => access.sourceEntityId);
    const trackerParams = {};
    if (params.name) trackerParams['name'] = params.name;
    if (params.subType) trackerParams['subType'] = params.subType;

    const trackers = await this.trackerDataService.getTrackers({
      ...trackerParams,
      type: params.type,
      ids: trackerIds,
      limit: params.limit,
      offset: params.offset,
    });

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

  async getTracker(
    user: TCachedUser,
    trackerId: string,
    query: GetTrackerByIdDto,
  ) {
    const tracker = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
      'USER',
    ]);

    const trackerResponse = await this.getTrackerResponse(user, tracker, query);
    return trackerResponse;
  }

  async getGroupedEventsCount(params: CountQueryDto, groupBy: CountGroup) {
    console.log(params);
    const data = await this.eventService.getEventsCount(params, false);
    if (groupBy === CountGroup.status) {
      return data.count;
    } else if (groupBy === CountGroup.eventTypeGroup) {
      console.log(data);
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
    const tracker = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
    ]);
    return this.trackerDataService.updateTracker(user, {
      ...data,
      id: tracker.id,
    });
  }

  async deleteTracker(user: TCachedUser, trackerId: string) {
    const tracker = await this.hasTrackerAccess(user, trackerId, [
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
    const tracker = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
      'USER',
    ]);
    const newParams = getNonEmptyParams(params);
    const convertedParams =
      this.sharedService.convertSlugParamsToIds(newParams);
    const eventParams = {
      ...(tracker.filterValue as Object),
      ...convertedParams,
      limit: params.limit,
      offset: params.offset,
    } as QueryDto;
    const events = await this.eventService.getAllEvents(
      eventParams,
      false,
      user.id,
    );
    return events;
  }

  async getTrackerSavedEvents(
    user: TCachedUser,
    trackerId: string,
    params: GetTrackerEventsDto,
  ) {
    const tracker = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
      'USER',
    ]);
    const savedEventsIds = (
      await this.intentDataService.getUserEventInterest({
        interest: 'BOOKMARK',
        sourceModule: 'TRACKER',
        sourceId: tracker.id,
        interestedUserId: user.id,
        accountId: user.accountId,
      })
    ).map((item) => item.id);

    if (savedEventsIds.length === 0) {
      return [];
    }

    const newParams = getNonEmptyParams(params);
    const convertedParams =
      this.sharedService.convertSlugParamsToIds(newParams);
    const eventParams = {
      eventIds: savedEventsIds,
      ...convertedParams,
      limit: params.limit,
      offset: params.offset,
    } as QueryDto;

    const events = await this.eventService.getAllEvents(
      eventParams,
      false,
      user.id,
    );
    return events;
  }

  async getTrackerEventsCount(
    user: TCachedUser,
    trackerId: string,
    params: GetTrackerEventsCountDto,
  ) {
    const tracker = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
      'USER',
    ]);
    const newParams = getNonEmptyParams(params);
    const convertedParams =
      this.sharedService.convertSlugParamsToIds(newParams);
    const eventParams = {
      ...(tracker.filterValue as Object),
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
    const tracker = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
      'USER',
    ]);

    const savedEventsIds = (
      await this.intentDataService.getUserEventInterest({
        interest: 'BOOKMARK',
        sourceModule: 'TRACKER',
        sourceId: tracker.id,
        interestedUserId: user.id,
        accountId: user.accountId,
      })
    ).map((item) => item.id);

    if (savedEventsIds.length === 0) {
      return [];
    }

    const newParams = getNonEmptyParams(params);
    const convertedParams =
      this.sharedService.convertSlugParamsToIds(newParams);
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
    const tracker = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
      'USER',
    ]);
    const comments = await this.commentDataService.getComments({
      accountId: user.accountId,
      sourceModule: 'TRACKER',
      sourceId: tracker.id,
      limit: params.limit,
      offset: params.offset,
    });
    return comments;
  }

  async getTrackerUsers(
    user: TCachedUser,
    trackerId: string,
    params: GetTrackerUsersDto,
  ) {
    const tracker = await this.hasTrackerAccess(user, trackerId, [
      'ADMIN',
      'SUPER_ADMIN',
      'USER',
    ]);
    const users = (
      await this.accessService.getAccess({
        sourceEntity: 'TRACKER',
        sourceEntityId: tracker.id,
        accountId: user.accountId,
        limit: params.limit,
        offset: params.offset,
      })
    ).map((item) => {
      const user = item.accessReceiver;
      return {
        id: user.id,
        name: `${user.firstname} ${user.lastname}`,
        email: user.email,
        imageUrl: user.imageUrl,
      };
    });
    return users;
  }

  async hasTrackerAccess(
    user: TCachedUser,
    trackerId: string,
    accessTypes: AccessType[],
    checkAccess: boolean = true,
  ) {
    const tracker = (
      await this.trackerDataService.getTrackers({
        ids: [trackerId],
        limit: 1,
        offset: 0,
        type: 'trackers',
      })
    )[0];
    if (!tracker)
      throw new HttpException('Tracker not found', HttpStatus.NOT_FOUND);
    const [hasAccess, result] = checkAccess
      ? await this.accessService.hasAccess({
          accessReceiverId: user.id,
          accessTypes: accessTypes,
          sourceEntity: 'TRACKER',
          sourceEntityId: tracker.id,
          accountId: user.accountId,
          limit: 1,
          offset: 0,
        })
      : [true, null];
    if (!hasAccess) {
      if (result) throw new HttpException(result.message, result.status);
      else throw new HttpException('Invalid Access', HttpStatus.FORBIDDEN);
    }
    return tracker;
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
}
