import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EventsDataService } from './events.data.service';
import { CountQueryDto, EventsTrendsDto, QueryDto, View } from './dto';
import { SharedService } from '../shared/shared.service';
import { TCachedUser } from 'src/utils/types';
import { getNonEmptyParams } from 'src/utils';
import { transformEventData } from './global.service';
import { IntentDataService } from 'src/intent/intent.data.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsDataService: EventsDataService,
    private readonly sharedService: SharedService,
    private readonly intentDataService: IntentDataService,
  ) {}

  async getAllEvents(
    query: QueryDto,
    validateIds: boolean = true,
    user?: TCachedUser,
  ) {
    let show = query.show || [];
    if (show.includes('old')) {
      show = show.filter((item) => item !== 'old');
    }
    const nonEmptyParams = getNonEmptyParams({ ...query, show });
    const convertedParams = await this.sharedService.convertSlugParamsToIds(
      nonEmptyParams,
      validateIds,
    );

    const fetchedEvents =
      await this.eventsDataService.getEvents(convertedParams);

    let events = fetchedEvents;
    console.log(query);
    if (
      ['list', 'tracker'].includes(query.view) &&
      !(query.eventTypes && query.eventTypes.includes('alert'))
    ) {
      let userInterests = {};
      if (user) {
        userInterests = await this.getGroupedEventInterests(
          user,
          events.events.map((event) => event.id),
        );
      }
      const transformedEvents = events.events.map((event) => {
        return {
          ...(query.show && query.show.includes('old')
            ? event
            : transformEventData(event)),

          ...(query.show && query.show.includes('old')
            ? {
                isSaved:
                  userInterests[event.id] && userInterests[event.id]['bookmark']
                    ? true
                    : false,
              }
            : { interests: userInterests[event.id] }),
        };
      });
      events = {
        count: events.count,
        events: transformedEvents,
      };
    }
    return events;
  }

  async getEvent(eventId: string, user?: TCachedUser) {
    const data = await this.eventsDataService.getEvents({
      eventIds: [eventId],
      view: View.detail,
      limit: 1,
      offset: 0,
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
      userInterests = await this.getGroupedEventInterests(user, [event.id]);
    }
    const eventResponse = {
      ...transformEventData(event),
      interests: userInterests[event.id],
    };
    return eventResponse;
  }

  async getGroupedEventInterests(user: TCachedUser, eventIds: string[]) {
    const interests = await this.intentDataService.getAllEventInterestsByUser(
      user,
      eventIds,
    );

    const groupedInterests = interests.reduce((acc, interest) => {
      acc[interest.eventId] = acc[interest.eventId] || {};
      acc[interest.eventId][interest.interest.toLowerCase()] = {
        interestId: interest.id,
      };
      return acc;
    }, {});

    return groupedInterests;
  }

  async getEventsCount(query: CountQueryDto, validateIds: boolean = true) {
    const nonEmptyParams = getNonEmptyParams(query);
    const convertedParams = await this.sharedService.convertSlugParamsToIds(
      nonEmptyParams,
      validateIds,
    );
    const count = await this.eventsDataService.getEventsCount(convertedParams);
    return count;
  }

  async getEventPocs(eventId: string) {
    return await this.eventsDataService.getEventPocs(eventId);
  }

  async getEventEditions(eventId: string) {
    return await this.eventsDataService.getEventEditions(eventId);
  }

  async getEventCoorganizers(eventId: string) {
    return await this.eventsDataService.getEventCoorganizers(eventId);
  }

  async getEventRankings(eventId: string) {
    return await this.eventsDataService.getEventRankings(eventId);
  }

  async getEventSpeakers(eventId: string) {
    return await this.eventsDataService.getEventSpeakers(eventId);
  }

  async getEventSponsors(eventId: string) {
    return await this.eventsDataService.getEventSponsors(eventId);
  }

  async getEventExhibitors(eventId: string) {
    return await this.eventsDataService.getEventExhibitors(eventId);
  }

  async getEventPolygons(eventId: string) {
    return await this.eventsDataService.getEventPolygons(eventId);
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
