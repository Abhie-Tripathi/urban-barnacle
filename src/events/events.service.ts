import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EventsDataService } from './events.data.service';
import {
  CountQueryDto,
  EventsTrendsDto,
  PocsUnmaskDto,
  QueryDto,
  Show,
  SortingDto,
  View,
} from './dto';
import { SharedService } from '../shared/shared.service';
import { defaultEventTypes, TCachedUser } from 'src/utils/types';
import { encrypt, getNonEmptyParams } from 'src/utils';
import { eventSearchFilterCheck, transformEventData } from './global.service';
import { IntentDataService } from 'src/intent/intent.data.service';
import { LimitDto } from 'src/global_dto';
import { AccountService } from 'src/user/account/account.service';
import { UserActivitySource } from '@prisma/client';
@Injectable()
export class EventsService {
  constructor(
    private readonly eventsDataService: EventsDataService,
    private readonly sharedService: SharedService,
    private readonly intentDataService: IntentDataService,
  ) {}

  async createLogForEncryptedQuery(query: QueryDto, user: TCachedUser) {
    const { save, requestSource, ...rest } = query;
    await this.eventsDataService.createLogForEncryptedQuery(
      encrypt(JSON.stringify(rest)),
      user,
      requestSource
        ? (requestSource.toUpperCase() as UserActivitySource)
        : 'RESEARCH',
    );
  }
  async getAllEvents(
    query: QueryDto,
    validateIds: boolean = true,
    user?: TCachedUser,
  ) {
    let show = query.show || [];
    if (show.includes(Show.old)) {
      show = show.filter((item) => item !== Show.old);
    }
    const nonEmptyParams = getNonEmptyParams({ ...query, show });
    if (
      !nonEmptyParams.eventTypes ||
      (nonEmptyParams.eventTypes && nonEmptyParams.eventTypes.length === 0)
    ) {
      const backend = process.env.BACKEND;
      if (backend && backend in defaultEventTypes) {
        if (validateIds) {
          nonEmptyParams.eventTypes = Object.keys(defaultEventTypes[backend]);
        } else {
          nonEmptyParams.eventTypes = Object.values(defaultEventTypes[backend]);
        }
      }
    }
    if (user) {
      const queryParams: QueryDto = Object.assign(nonEmptyParams);
      const configuration =
        await this.eventsDataService.getAccountConfiguration(
          user.accountConfigurationId,
        );
      if (
        configuration &&
        configuration['filter'] &&
        Object.keys(configuration['filter']).length > 0
      ) {
        const { result, rootTodiscard } = eventSearchFilterCheck(
          configuration,
          queryParams,
        );
        if (!result && rootTodiscard.length > 1) {
          throw new HttpException(
            `Certain selected values like ${rootTodiscard} are restricted under your current plan.`,
            HttpStatus.NOT_ACCEPTABLE,
          );
        }
      }
    }
    const convertedParams = await this.sharedService.convertSlugParamsToIds(
      nonEmptyParams,
      validateIds,
    );

    const fetchedEvents =
      await this.eventsDataService.getEvents(convertedParams);
    // console.log({ convertedParams }, { nonEmptyParams });
    let events = fetchedEvents;
    if (['list', 'tracker'].includes(query.view)) {
      let userInterests = {};
      if (
        user &&
        (!query.eventTypes ||
          (query.eventTypes.length > 0 && !query.eventTypes.includes('alert')))
      ) {
        userInterests = await this.getGroupedEventInterests(
          user,
          events.events.map((event) => event.basic.id),
          query.trackerId,
        );
      }
      const transformedEvents = events.events.map((event) => {
        return {
          // ...(query.show && query.show.includes(Show.old)
          //   ? event
          //   : transformEventData(event)),

          // ...(query.show && query.show.includes(Show.old)
          //   ? {
          //       isSaved:
          //         userInterests[event.id] && userInterests[event.id]['bookmark']
          //           ? true
          //           : false,
          //     }
          //   : { interests: userInterests[event.id] }),
          ...event,
          interests:
            Object.keys(userInterests).length > 0
              ? userInterests[event.basic.id]
              : !query.eventTypes ||
                  (query.eventTypes.length > 0 &&
                    !query.eventTypes.includes('alert'))
                ? []
                : undefined,
        };
      }) as any;
      events = {
        count: events.count,
        events: transformedEvents,
      };
    }
    return events;
  }

  async getEvent(eventId: string, showValues: string, user?: TCachedUser) {
    const data = await this.eventsDataService.getEvents({
      eventIds: [eventId],
      view: View.detail,
      limit: 1,
      offset: 0,
      showValues,
    });
    if (
      !data ||
      (data && !data.events) ||
      (data && data.events && data.events.length === 0)
    ) {
      throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
    }
    const event = data.events[0];
    let userInterests = {};
    if (user) {
      userInterests = await this.getGroupedEventInterests(
        user,
        [event.basic.id],
        undefined,
      );
    }
    const eventResponse = {
      ...event,
      interests: userInterests[event.basic.id],
    };
    return eventResponse;
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

  async getEventsCount(query: CountQueryDto, validateIds: boolean = true) {
    const nonEmptyParams = getNonEmptyParams(query);
    if (
      !nonEmptyParams.eventTypes ||
      (nonEmptyParams.eventTypes && nonEmptyParams.eventTypes.length === 0)
    ) {
      const backend = process.env.BACKEND;
      if (backend && backend in defaultEventTypes) {
        if (validateIds) {
          nonEmptyParams.eventTypes = Object.keys(defaultEventTypes[backend]);
        } else {
          nonEmptyParams.eventTypes = Object.values(defaultEventTypes[backend]);
        }
      }
    }
    const convertedParams = await this.sharedService.convertSlugParamsToIds(
      nonEmptyParams,
      validateIds,
    );
    const count = await this.eventsDataService.getEventsCount(convertedParams);
    return count;
  }

  async getEventPocs(eventId: string, query: SortingDto) {
    return await this.eventsDataService.getEventPocs(
      eventId,
      query.sortBy ? query.sortBy : 'desc',
    );
  }

  async getEventEditions(eventId: string, query: LimitDto) {
    return await this.eventsDataService.getEventEditions(eventId, query);
  }

  async getEventCoorganizers(eventId: string) {
    return await this.eventsDataService.getEventCoorganizers(eventId);
  }

  async getEventRankings(eventId: string) {
    return await this.eventsDataService.getEventRankings(eventId);
  }

  async getEventSpeakers(eventId: string, query: LimitDto) {
    return await this.eventsDataService.getEventSpeakers(eventId, query);
  }

  async getEventSponsors(eventId: string, query: LimitDto) {
    return await this.eventsDataService.getEventSponsors(eventId, query);
  }

  async getEventExhibitors(eventId: string, query: LimitDto) {
    return await this.eventsDataService.getEventExhibitors(eventId, query);
  }

  async getEventPolygons(eventId: string) {
    return await this.eventsDataService.getEventPolygons(eventId);
  }
  async getEventIntelScore(eventId: string, user: TCachedUser) {
    return await this.eventsDataService.getEventIntelScore(eventId, user);
  }
  async getEventsTrends(query: EventsTrendsDto) {
    const nonEmptyParams = getNonEmptyParams(query);
    const convertedParams = await this.sharedService.convertSlugParamsToIds(
      nonEmptyParams,
      true,
    );
    return await this.eventsDataService.getEventsTrends(convertedParams);
  }
}
