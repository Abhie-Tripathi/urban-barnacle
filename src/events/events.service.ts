import { Injectable } from '@nestjs/common';
import { EventsDataService } from './events.data.service';
import { CountQueryDto, EventsTrendsDto, QueryDto } from './dto';
import { SharedService } from '../shared/shared.service';
import { TCachedUser } from 'src/utils/types';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsDataService: EventsDataService,
    private readonly sharedService: SharedService,
  ) {}

  async getAllEvents(
    userId: string,
    query: QueryDto,
    validateIds: boolean = true,
  ) {
    const nonEmptyParams = this.sharedService.getNonEmptyParams(query);
    const convertedParams = await this.sharedService.convertSlugParamsToIds(
      nonEmptyParams,
      validateIds,
    );

    const fetchedEvents =
      await this.eventsDataService.getEvents(convertedParams);
    let events = fetchedEvents;
    if (
      query.view === 'list' &&
      !(query.eventTypes && query.eventTypes.includes('alert'))
    ) {
      const savedEventsIds = {};
      events = events.map((event) => {
        return {
          ...event,
          isSaved: savedEventsIds[event.id],
        };
      });
    }
    return events;
  }

  async getEvent(userId: string, eventId: string) {
    const fetchedEvents = await this.eventsDataService.getEvents({
      eventIds: [eventId],
    });
    const isSaved = {};
    const event = {
      ...fetchedEvents[0],
      isSaved: isSaved[fetchedEvents[0].id],
    };
    return event;
  }

  async getEventsCount(query: CountQueryDto) {
    return await this.eventsDataService.getEventsCount(query);
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
    return await this.eventsDataService.getEventsTrends(query);
  }
}
