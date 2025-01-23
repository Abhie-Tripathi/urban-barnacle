import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EventsDataService } from './events.data.service';
import { CountQueryDto, EventsTrendsDto, QueryDto } from './dto';
import { SharedService } from '../shared/shared.service';
import { TCachedUser } from 'src/utils/types';
import { getNonEmptyParams } from 'src/utils';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsDataService: EventsDataService,
    private readonly sharedService: SharedService,
  ) {}

  async getAllEvents(
    query: QueryDto,
    validateIds: boolean = true,
    userId?: string,
  ) {
    const nonEmptyParams = getNonEmptyParams(query);
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
    const data = await this.eventsDataService.getEvents({
      eventIds: [eventId],
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
    console.log(event);
    const isSaved = {};
    const eventResponse = {
      ...event,
      isSaved: isSaved[event.id],
    };
    return eventResponse;
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
