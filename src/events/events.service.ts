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
import { fetchDatafromMicroService } from 'src/shared/microservice.api';
@Injectable()
export class EventsService {
  constructor(
    private readonly eventsDataService: EventsDataService,
    private readonly sharedService: SharedService,
    private readonly intentDataService: IntentDataService,
  ) { }

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
  async processEvent(content: any): Promise<any> {
    content.name = content.name?.trim();
    content.website = content.website?.trim();
    const eventRuleArray: Record<number, number> = {};
    let rule = "N-A";
    // Website domain extraction
    let domain = '';
    if (content.website) {
      domain = content.website;
    }

    let blockStatus = 1;
    const eventData = [];
    let latLong = 1;
    let latitude: number | null = null, longitude: number | null = null, cntry: number | null = null;

    // Process location from content
    if (content.location) {
      const latLongArr = content.location.split(',');
      latitude = parseFloat(latLongArr[0]);
      longitude = parseFloat(latLongArr[1]);
    }

    // Get lat/long from venue if not provided and venue is numeric
    // if ((!latitude || !longitude) && !isNaN(content.venue)) {
    //   latLong = 0;
    //   const cityLatLong = await this.venueRepository.findOne({
    //     where: { id: content.venue },
    //     relations: ['country']
    //   });

    //   if (cityLatLong) {
    //     latitude = cityLatLong.geoLat;
    //     longitude = cityLatLong.geoLong;
    //     cntry = cityLatLong.country.id;
    //   }
    // }


    // Get lat/long from city if not provided and city is numeric
    // if ((!latitude || !longitude) && !isNaN(content.city)) {
    //   latLong = 0;
    //   const cityLatLong = await this.cityRepository.findOne({
    //     where: { id: content.city },
    //     relations: ['country', 'stateId']
    //   });

    //   if (cityLatLong) {
    //     latitude = cityLatLong.geoLat;
    //     longitude = cityLatLong.geoLong;
    //     cntry = cityLatLong.country.id;
    //   }
    // }

    // Check if we have valid latitude/longitude
    if (!latitude || !longitude) {
      throw new HttpException('latitude and longitude are missing', HttpStatus.FAILED_DEPENDENCY);
    }

    content.latitude = latitude;
    content.longitude = longitude;

    // Calculate search radius parameters
    const radius = 50; // kilometers
    const parameter = 0.02 * radius;
    const R = 6371; // earth's mean radius, km

    let maxLat = latitude + this.rad2deg(radius / R);
    let minLat = latitude - this.rad2deg(radius / R);
    let maxLon = longitude + this.rad2deg(radius / R / Math.cos(this.deg2rad(latitude)));
    let minLon = longitude - this.rad2deg(radius / R / Math.cos(this.deg2rad(latitude)));

    if (minLat > maxLat) {
      maxLat = latitude - this.rad2deg(radius / R);
      minLat = latitude + this.rad2deg(radius / R);
    }

    if (minLon > maxLon) {
      maxLon = longitude + this.rad2deg(radius / R / Math.cos(this.deg2rad(latitude)));
      minLon = longitude - this.rad2deg(radius / R / Math.cos(this.deg2rad(latitude)));
    }

    const andWhere = `(er.geoLong > (${minLon}) AND er.geoLong < (${maxLon}) AND er.geoLat > (${minLat}) AND er.geoLat < (${maxLat})) OR (cit.geoLong > (${minLon}) AND cit.geoLong < (${maxLon}) AND cit.geoLat > (${minLat}) AND cit.geoLat < (${maxLat}))`;
    const andWhere1 = `v.geoLong > (${minLon}) AND v.geoLong < (${maxLon}) AND v.geoLat > (${minLat}) AND v.geoLat < (${maxLat})`;
    const dist: string = `(3959 * acos (cos ( radians(".$latitude.") )* cos( radians( er.geoLat ) )* cos( radians( er.geoLong ) - radians(".$longitude.") )+ sin ( radians(".$latitude.") )* sin( radians( er.geoLat ) )))*1.60934 AS distance, (cos ( radians(".$latitude.") )* cos( radians( er.geoLat ) )* cos( radians( er.geoLong ) - radians(".$longitude.") )+ sin ( radians(".$latitude.") )* sin( radians( er.geoLat ) ))  acosval,
      (3959 * acos(cos(radians(".$latitude.")) * cos(radians(cit.geoLat)) * cos(radians(cit.geoLong) - radians(".$longitude.")) + sin(radians(".$latitude.")) * sin(radians(cit.geoLat)))) * 1.60934 AS distance1, (cos(radians(".$latitude.")) * cos(radians(cit.geoLat)) * cos(radians(cit.geoLong) - radians(".$longitude.")) + sin(radians(".$latitude.")) * sin(radians(cit.geoLat)))  acosval1 `;

    // Process event name for search
    const searchOrigWithSpace = ['-'];
    const replaceOrigWithSpace = [' - '];

    // Get stop words from S3
    const stopWordsArraySpace = await this.getStopWordsFromS3();
    stopWordsArraySpace.sort((a, b) => b.length - a.length);

    const stopWordsArray = ['+', '!', '-', "'", ':', '(', ')', '’', '/', '"', '&', ',', '@', '#', '$', '%', '^', '*', '—', '=', '_', '{', '[', ']', '}', ';', '.', '‘', '<', '>', '?', '|'];

    let tempName = this.replaceAll(content.name, searchOrigWithSpace, replaceOrigWithSpace);
    let origName = this.replaceAll(tempName, stopWordsArray, [' ']);
    let origNameWithNum = origName;
    origName = origName.replace(/[\d]+/g, '');
    origName = [...new Set([...origName.split(' '), ...origNameWithNum.split(' ')])].join(' ');
    origName = origName.replace(/\s+/g, ' ');

    // Get city info for additional filtering
    const cityReplace = await fetchDatafromMicroService('locationSuggestionApi', content.locationIds.split(',')) as {
      "data": {
        "formattedLocations":
        {
          "id": string,
          "name": string,
          "displayName": string,
          "latitude": number,
          "longitude": number,
          "locationType": string,
          "country"?: {
            "id": string,
            "name": string,
            "latitude"?: number,
            "longitude"?: number,
            "iso"?: string
          },
          "state"?: {
            "id": string,
            "name": string,
            "latitude"?: number,
            "longitude"?: number
          }
        }[]

      }
    };

    let origNameModified = ` ${origName.toLowerCase()} `;
    for (const word of stopWordsArraySpace) {
      origNameModified = origNameModified.replace(new RegExp(` ${word} `, 'gi'), ' ');
    }

    if (cityReplace) {
      origNameModified = origNameModified.replace(new RegExp(` ${cityReplace.data.formattedLocations[0].name.toLowerCase()} `, 'gi'), ' ');
      origNameModified = origNameModified.replace(new RegExp(` ${cityReplace.data.formattedLocations[0]?.country?.name?.toLowerCase()} `, 'gi'), ' ');
      if (cityReplace.data.formattedLocations[0]?.state) {
        origNameModified = origNameModified.replace(new RegExp(` ${cityReplace.data.formattedLocations[0]?.state?.name?.toLowerCase()} `, 'gi'), ' ');
      }
    }

    origNameModified = origNameModified.replace(/\s+/g, ' ').trim();
    const origNameArray = origNameModified.split(' ').map(word => {
      if (!word.match(/&([a-zA-Z])(uml|acute|grave|circ|tilde);/)) {
        let temp = word.normalize('NFKD');
        temp = temp.replace(/&([a-zA-Z])(uml|acute|grave|circ|tilde);/g, '$1');
        return temp;
      }
      return word;
    });

    // Build search queries
    let whereLike = '';
    let whereLikeSn = '';
    let sufficientDataFound = 0;
    let flagForRule = 0;

    for (const [key, value] of origNameArray.entries()) {
      if (value.length > 2) {
        if (key === 0) {
          whereLike += ` e.name LIKE ?${value}`;
        } else {
          whereLike += ` OR e.name LIKE ?${value}`;
        }
        sufficientDataFound = 1;
      }
    }

    if (sufficientDataFound === 0) {
      for (const [key, value] of origNameArray.entries()) {
        if (value.length >= 1) {
          if (key === 0) {
            whereLike += ` e.name LIKE ?${value}`;
          } else {
            whereLike += ` OR e.name LIKE ?${value}`;
          }
          flagForRule = 1;
        }
      }
    }
    const whereConditions: string[] = [];
    whereLike = whereLike.replace(/^ OR /, '');
    whereLikeSn = whereLikeSn.replace(/^ OR /, '');
    if (flagForRule && content['name'] && content['name'].length > 0 && content['startDate'] && content['startDate'].length > 0) {


      whereConditions.push(`
        (e."name" = '${content.name}')
      `);

      // Date conditions
      if (content.tba && content.tba == 1) {
        const time = new Date(content.startDate).getTime();
        const month = new Date(time).getMonth() + 1;
        whereConditions.push(`
        (er."startDate" = '${content.startDate}' OR 
        EXTRACT(MONTH FROM er."startDate") = '${month}')
      `);
      } else {
        whereConditions.push(`er."startDate" = '${content.startDate}'`);
      }

      // Exclude condition
      if (content.exclude) {
        whereConditions.push(`er."id" NOT IN (${content.exclude})`);
      }

      // Combine all conditions
      const whereClause = whereConditions.join(' AND ');

      // HAVING condition
      const havingClause = `
      (
      (distance <= ${radius} OR 
      distance1 <= ${radius} OR 
      acosval > 1 OR 
      acosval < -1 OR 
      acosval1 > 1 OR 
      acosval1 < -1))
    `;

      // Execute raw query with Prisma
      const eventQuery: string = `
      SELECT 
        DISTINCT er."event",
        e."name",
        e."abbrName" AS "abbrName",
        e."multiCity" AS "multici",
        er."country" AS "con",
        er."city" AS "eventCity",
        cit."state",
        cit."name" AS "cityName",
        country."name" AS "countryName",
        ${dist}
      FROM 
        "EventReplica" er
      INNER JOIN 
        "Event" e ON e."id" = er."event" AND e."eventType" < 10
      LEFT JOIN 
        "City" cit ON cit."id" = er."phyCity"
      LEFT JOIN 
        "Country" country ON country."id" = er."country"
      WHERE 
        ${whereClause}
      HAVING 
        ${havingClause}
    `;
      const eventData: object[] = [];
      // Process event data
      for (const value of eventData) {
        let eventName = this.replaceAll(value['name'], stopWordsArray, [' ']);
        eventName = eventName.replace(/[\d]+/g, '');
        eventName = eventName.replace(/\s+/g, ' ').trim();

        let eventNameModified = ` ${eventName.toLowerCase()} `;

        // Remove stop words
        for (const word of stopWordsArraySpace) {
          eventNameModified = eventNameModified.replace(new RegExp(` ${word} `, 'gi'), ' ');
        }

        // Remove location-related words
        eventNameModified = eventNameModified
          .replace(new RegExp(` ${value['cityName'].toLowerCase()} `, 'gi'), ' ')
          .replace(new RegExp(` ${value['countryName'].toLowerCase()} `, 'gi'), ' ')
          .replace(new RegExp(` ${value['state']?.toLowerCase() || ''} `, 'gi'), ' ');

        eventNameModified = eventNameModified.trim();

        // Check for exact name match
        if (origName === eventNameModified && !eventRuleArray[value['event']]) {
          eventRuleArray[value['event']] = 1;
        } else if (
          (value['name']?.toLowerCase() === content.name.toLowerCase()) &&
          !eventRuleArray[value['name']]
        ) {
          eventRuleArray[value['name']] = 1;
        }
      }

      blockStatus = -1;
      rule = "1";

    }
    if (flagForRule && content['name'] && content['name'].length > 0 && content['endDate'] && content['endDate'].length > 0) {


      whereConditions.push(`
        (e."name" = '${content.name}')
      `);

      // Date conditions
      if (content.tba && content.tba == 1) {
        const time = new Date(content.endDate).getTime();
        const month = new Date(time).getMonth() + 1;
        whereConditions.push(`
        (er."endDate" = '${content.endDate}' OR 
        EXTRACT(MONTH FROM er."endDate") = '${month}')
      `);
      } else {
        whereConditions.push(`er."endDate" = '${content.endDate}'`);
      }

      // Exclude condition
      if (content.exclude) {
        whereConditions.push(`er."id" NOT IN (${content.exclude})`);
      }

      // Combine all conditions
      const whereClause = whereConditions.join(' AND ');

      // HAVING condition
      const havingClause = `
      (
      (distance <= ${radius} OR 
      distance1 <= ${radius} OR 
      acosval > 1 OR 
      acosval < -1 OR 
      acosval1 > 1 OR 
      acosval1 < -1))
    `;

      // Execute raw query with Prisma
      const eventQuery: string = `
      SELECT 
        DISTINCT er."event",
        e."name",
        e."abbrName" AS "abbrName",
        e."multiCity" AS "multici",
        er."country" AS "con",
        er."city" AS "eventCity",
        cit."state",
        cit."name" AS "cityName",
        country."name" AS "countryName",
        ${dist}
      FROM 
        "EventReplica" er
      INNER JOIN 
        "Event" e ON e."id" = er."event" AND e."eventType" < 10
      LEFT JOIN 
        "City" cit ON cit."id" = er."phyCity"
      LEFT JOIN 
        "Country" country ON country."id" = er."country"
      WHERE 
        ${whereClause}
      HAVING 
        ${havingClause}
    `;
      const eventData: object[] = [];
      // Process event data
      for (const value of eventData) {
        let eventName = this.replaceAll(value['name'], stopWordsArray, [' ']);
        eventName = eventName.replace(/[\d]+/g, '');
        eventName = eventName.replace(/\s+/g, ' ').trim();

        let eventNameModified = ` ${eventName.toLowerCase()} `;

        // Remove stop words
        for (const word of stopWordsArraySpace) {
          eventNameModified = eventNameModified.replace(new RegExp(` ${word} `, 'gi'), ' ');
        }

        // Remove location-related words
        eventNameModified = eventNameModified
          .replace(new RegExp(` ${value['cityName'].toLowerCase()} `, 'gi'), ' ')
          .replace(new RegExp(` ${value['countryName'].toLowerCase()} `, 'gi'), ' ')
          .replace(new RegExp(` ${value['state']?.toLowerCase() || ''} `, 'gi'), ' ');

        eventNameModified = eventNameModified.trim();

        // Check for exact name match
        if (origName === eventNameModified && !eventRuleArray[value['event']]) {
          eventRuleArray[value['event']] = 2;
        } else if (
          (value['name']?.toLowerCase() === content.name.toLowerCase()) &&
          !eventRuleArray[value['name']]
        ) {
          eventRuleArray[value['name']] = 2;
        }
      }

      blockStatus = -2;
      rule = "2";

    }
    if (flagForRule && content['name'] && content['name'].length > 0) {

      whereConditions.push(`
        (e."name" = '${content.name}')
      `);

      // Exclude condition
      if (content.exclude) {
        whereConditions.push(`er."id" NOT IN (${content.exclude})`);
      }

      // Combine all conditions
      const whereClause = whereConditions.join(' AND ');

      // HAVING condition
      const havingClause = `
      (
      (distance <= ${radius} OR 
      distance1 <= ${radius} OR 
      acosval > 1 OR 
      acosval < -1 OR 
      acosval1 > 1 OR 
      acosval1 < -1))
    `;

      // Execute raw query with Prisma
      const eventQuery: string = `
      SELECT 
        DISTINCT er."event",
        e."name",
        e."abbrName" AS "abbrName",
        e."multiCity" AS "multici",
        er."country" AS "con",
        er."city" AS "eventCity",
        cit."state",
        cit."name" AS "cityName",
        country."name" AS "countryName",
        ${dist}
      FROM 
        "EventReplica" er
      INNER JOIN 
        "Event" e ON e."id" = er."event" AND e."eventType" < 10
      LEFT JOIN 
        "City" cit ON cit."id" = er."phyCity"
      LEFT JOIN 
        "Country" country ON country."id" = er."country"
      WHERE 
        ${whereClause}
      HAVING 
        ${havingClause}
    `;
      const eventData: object[] = [];
      // Process event data
      for (const value of eventData) {
        let eventName = this.replaceAll(value['name'], stopWordsArray, [' ']);
        eventName = eventName.replace(/[\d]+/g, '');
        eventName = eventName.replace(/\s+/g, ' ').trim();

        let eventNameModified = ` ${eventName.toLowerCase()} `;

        // Remove stop words
        for (const word of stopWordsArraySpace) {
          eventNameModified = eventNameModified.replace(new RegExp(` ${word} `, 'gi'), ' ');
        }

        // Remove location-related words
        eventNameModified = eventNameModified
          .replace(new RegExp(` ${value['cityName'].toLowerCase()} `, 'gi'), ' ')
          .replace(new RegExp(` ${value['countryName'].toLowerCase()} `, 'gi'), ' ')
          .replace(new RegExp(` ${value['state']?.toLowerCase() || ''} `, 'gi'), ' ');

        eventNameModified = eventNameModified.trim();

        // Check for exact name match
        if (origName === eventNameModified && !eventRuleArray[value['event']]) {
          eventRuleArray[value['event']] = 3;
        } else if (
          (value['name']?.toLowerCase() === content.name.toLowerCase()) &&
          !eventRuleArray[value['name']]
        ) {
          eventRuleArray[value['name']] = 3;
        }
      }

      blockStatus = -3;
      rule = "3";
    }
    if (flagForRule && content['name'] && content['name'].length > 0 && content['website'] && content['website'].length > 0) {

      whereConditions.push(`
        (e."name" = '${content.name}') OR 
      `);
      whereConditions.push(`
        (e."hosts" = '${content['website']}')
      `);
      // Exclude condition
      if (content.exclude) {
        whereConditions.push(`er."id" NOT IN (${content.exclude})`);
      }

      // Combine all conditions
      const whereClause = whereConditions.join(' AND ');

      // HAVING condition
      const havingClause = `
      (
      (distance <= ${radius} OR 
      distance1 <= ${radius} OR 
      acosval > 1 OR 
      acosval < -1 OR 
      acosval1 > 1 OR 
      acosval1 < -1))
    `;

      // Execute raw query with Prisma
      const eventQuery: string = `
      SELECT 
        DISTINCT er."event",
        e."name",
        e."abbrName" AS "abbrName",
        e."multiCity" AS "multici",
        er."country" AS "con",
        er."city" AS "eventCity",
        cit."state",
        cit."name" AS "cityName",
        country."name" AS "countryName",
        ${dist}
      FROM 
        "EventReplica" er
      INNER JOIN 
        "Event" e ON e."id" = er."event" AND e."eventType" < 10
      LEFT JOIN 
        "City" cit ON cit."id" = er."phyCity"
      LEFT JOIN 
        "Country" country ON country."id" = er."country"
      WHERE 
        ${whereClause}
      HAVING 
        ${havingClause}
    `;
      const eventData: object[] = [];
      // Process event data
      for (const value of eventData) {
        let eventName = this.replaceAll(value['name'], stopWordsArray, [' ']);
        eventName = eventName.replace(/[\d]+/g, '');
        eventName = eventName.replace(/\s+/g, ' ').trim();

        let eventNameModified = ` ${eventName.toLowerCase()} `;

        // Remove stop words
        for (const word of stopWordsArraySpace) {
          eventNameModified = eventNameModified.replace(new RegExp(` ${word} `, 'gi'), ' ');
        }

        // Remove location-related words
        eventNameModified = eventNameModified
          .replace(new RegExp(` ${value['cityName'].toLowerCase()} `, 'gi'), ' ')
          .replace(new RegExp(` ${value['countryName'].toLowerCase()} `, 'gi'), ' ')
          .replace(new RegExp(` ${value['state']?.toLowerCase() || ''} `, 'gi'), ' ');

        eventNameModified = eventNameModified.trim();

        // Check for exact name match
        if (origName === eventNameModified && !eventRuleArray[value['event']]) {
          eventRuleArray[value['event']] = 4;
        } else if (
          (value['name']?.toLowerCase() === content.name.toLowerCase()) &&
          !eventRuleArray[value['name']]
        ) {
          eventRuleArray[value['name']] = 4;
        }
      }

      blockStatus = -4;
      rule = "4";
    }
    if (origName && origName.length > 0) {

      whereConditions.push(`
        (e."name" = '${content.name}')
      `);
      // Exclude condition
      if (content.exclude) {
        whereConditions.push(`er."id" NOT IN (${content.exclude})`);
      }

      // Combine all conditions
      const whereClause = whereConditions.join(' AND ');

      // HAVING condition
      const havingClause = `
      (
      (distance <= ${radius} OR 
      distance1 <= ${radius} OR 
      acosval > 1 OR 
      acosval < -1 OR 
      acosval1 > 1 OR 
      acosval1 < -1))
    `;

      // Execute raw query with Prisma
      const eventQuery: string = `
      SELECT 
        DISTINCT er."event",
        e."name",
        e."abbrName" AS "abbrName",
        e."multiCity" AS "multici",
        er."country" AS "con",
        er."city" AS "eventCity",
        cit."state",
        cit."name" AS "cityName",
        country."name" AS "countryName",
        ${dist}
      FROM 
        "EventReplica" er
      INNER JOIN 
        "Event" e ON e."id" = er."event" AND e."eventType" < 10
      LEFT JOIN 
        "City" cit ON cit."id" = er."phyCity"
      LEFT JOIN 
        "Country" country ON country."id" = er."country"
      WHERE 
        ${whereClause}
      HAVING 
        ${havingClause}
    `;
      const eventData: object[] = [];
      // Process event data
      for (const value of eventData) {
        // Replace special characters in the name
        let processedName = this.replaceAll(value['name'], searchOrigWithSpace, replaceOrigWithSpace);

        // Remove stop words (case insensitive)
        processedName = this.replaceAllCaseInsensitive(processedName, stopWordsArray, ' ');

        // Remove numbers and extra spaces
        processedName = processedName.replace(/[\d]+/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Convert to lowercase and split into words
        const eventNameArray = processedName.toLowerCase().split(' ');

        // Process the name with space padding for whole word matching
        let eventName = ` ${processedName.toLowerCase()} `;

        // Remove stop words (space-padded version)
        for (const stopWord of stopWordsArraySpace) {
          eventName = eventName.replace(new RegExp(` ${stopWord} `, 'gi'), ' ');
        }

        // Remove location-related words
        if (value['cityName']) {
          eventName = eventName.replace(new RegExp(` ${value['cityName'].toLowerCase()} `, 'gi'), ' ');
        }
        if (value['countryName']) {
          eventName = eventName.replace(new RegExp(` ${value['countryName'].toLowerCase()} `, 'gi'), ' ');
        }
        if (value['state']) {
          eventName = eventName.replace(new RegExp(` ${value['state'].toLowerCase()} `, 'gi'), ' ');
        }

        // Final cleanup
        const eventNameModified = eventName.trim();
        const finalEventNameArray = eventNameModified.toLowerCase().split(' ');

        // Calculate differences between original and processed names
        const diff1 = this.arrayDifference(origNameArray, finalEventNameArray);
        const diff2 = this.arrayDifference(finalEventNameArray, origNameArray);

        // Set event rule if either difference is empty (exact or subset match)
        if ((diff1.length === 0 || diff2.length === 0) && !eventRuleArray[value['event']]) {
          eventRuleArray[value['event']] = 5;
        }
      }
      blockStatus = -5;
      rule = "5";
    }
    if (origName && origName.length > 0 && content['website'] && content['website'].length > 0) {

      whereConditions.push(`
        (e."name" = '${content.name}')
      `);
      whereConditions.push(`
        (e."hosts" = '${content.hosts}')
      `);
      // Exclude condition
      if (content.exclude) {
        whereConditions.push(`er."id" NOT IN (${content.exclude})`);
      }

      // Combine all conditions
      const whereClause = whereConditions.join(' AND ');

      // HAVING condition
      const havingClause = `
      (
      (distance <= ${radius} OR 
      distance1 <= ${radius} OR 
      acosval > 1 OR 
      acosval < -1 OR 
      acosval1 > 1 OR 
      acosval1 < -1))
    `;

      // Execute raw query with Prisma
      const eventQuery: string = `
      SELECT 
        DISTINCT er."event",
        e."name",
        e."abbrName" AS "abbrName",
        e."multiCity" AS "multici",
        er."country" AS "con",
        er."city" AS "eventCity",
        cit."state",
        cit."name" AS "cityName",
        country."name" AS "countryName",
        ${dist}
      FROM 
        "EventReplica" er
      INNER JOIN 
        "Event" e ON e."id" = er."event" AND e."eventType" < 10
      LEFT JOIN 
        "City" cit ON cit."id" = er."phyCity"
      LEFT JOIN 
        "Country" country ON country."id" = er."country"
      WHERE 
        ${whereClause}
      HAVING 
        ${havingClause}
    `;
      const eventData: object[] = [];
      // Process event data
      for (const value of eventData) {
        // Replace special characters in the name
        let processedName = this.replaceAll(value['name'], searchOrigWithSpace, replaceOrigWithSpace);

        // Remove stop words (case insensitive)
        processedName = this.replaceAllCaseInsensitive(processedName, stopWordsArray, ' ');

        // Remove numbers and extra spaces
        processedName = processedName.replace(/[\d]+/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Convert to lowercase and split into words
        const eventNameArray = processedName.toLowerCase().split(' ');

        // Process the name with space padding for whole word matching
        let eventName = ` ${processedName.toLowerCase()} `;

        // Remove stop words (space-padded version)
        for (const stopWord of stopWordsArraySpace) {
          eventName = eventName.replace(new RegExp(` ${stopWord} `, 'gi'), ' ');
        }

        // Remove location-related words
        if (value['cityName']) {
          eventName = eventName.replace(new RegExp(` ${value['cityName'].toLowerCase()} `, 'gi'), ' ');
        }
        if (value['countryName']) {
          eventName = eventName.replace(new RegExp(` ${value['countryName'].toLowerCase()} `, 'gi'), ' ');
        }
        if (value['state']) {
          eventName = eventName.replace(new RegExp(` ${value['state'].toLowerCase()} `, 'gi'), ' ');
        }

        // Final cleanup
        const eventNameModified = eventName.trim();
        const finalEventNameArray = eventNameModified.toLowerCase().split(' ');

        // Calculate differences between original and processed names
        const diff1 = this.arrayDifference(origNameArray, finalEventNameArray);
        const diff2 = this.arrayDifference(finalEventNameArray, origNameArray);

        // Set event rule if either difference is empty (exact or subset match)
        if ((diff1.length === 0 || diff2.length === 0) && !eventRuleArray[value['event']]) {
          eventRuleArray[value['event']] = 6;
        }
      }
      blockStatus = -6;
      rule = "6";
    }
    if (origName && origName.length > 0 && content['venue'] && content['startDate'] && content['startDate'].length > 0) {

      whereConditions.push(`
        (e."name" = '${content.name}')
      `);
      whereConditions.push(`
        (e."venue" = '${content.venue}')
      `);
      // Date conditions
      if (content.tba && content.tba == 1) {
        const time = new Date(content.startDate).getTime();
        const month = new Date(time).getMonth() + 1;
        whereConditions.push(`
        (er."startDate" = '${content.startDate}' OR 
        EXTRACT(MONTH FROM er."startDate") = '${month}')
      `);
      } else {
        whereConditions.push(`er."startDate" = '${content.startDate}'`);
      }
      // Exclude condition
      if (content.exclude) {
        whereConditions.push(`er."id" NOT IN (${content.exclude})`);
      }

      // Combine all conditions
      const whereClause = whereConditions.join(' AND ');

      // HAVING condition
      const havingClause = `
      (
      (distance <= ${radius} OR 
      distance1 <= ${radius} OR 
      acosval > 1 OR 
      acosval < -1 OR 
      acosval1 > 1 OR 
      acosval1 < -1))
    `;

      // Execute raw query with Prisma
      const eventQuery: string = `
      SELECT 
        DISTINCT er."event",
        e."name",
        e."abbrName" AS "abbrName",
        e."multiCity" AS "multici",
        er."country" AS "con",
        er."city" AS "eventCity",
        cit."state",
        cit."name" AS "cityName",
        country."name" AS "countryName",
        ${dist}
      FROM 
        "EventReplica" er
      INNER JOIN 
        "Event" e ON e."id" = er."event" AND e."eventType" < 10
      LEFT JOIN 
        "City" cit ON cit."id" = er."phyCity"
      LEFT JOIN 
        "Country" country ON country."id" = er."country"
      WHERE 
        ${whereClause}
      HAVING 
        ${havingClause}
    `;
      const eventData: object[] = [];
      // Process event data
      for (const value of eventData) {
        // Replace special characters in the name
        let processedName = this.replaceAll(value['name'], searchOrigWithSpace, replaceOrigWithSpace);

        // Remove stop words (case insensitive)
        processedName = this.replaceAllCaseInsensitive(processedName, stopWordsArray, ' ');

        // Remove numbers and extra spaces
        processedName = processedName.replace(/[\d]+/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Convert to lowercase and split into words
        const eventNameArray = processedName.toLowerCase().split(' ');

        // Process the name with space padding for whole word matching
        let eventName = ` ${processedName.toLowerCase()} `;

        // Remove stop words (space-padded version)
        for (const stopWord of stopWordsArraySpace) {
          eventName = eventName.replace(new RegExp(` ${stopWord} `, 'gi'), ' ');
        }

        // Remove location-related words
        if (value['cityName']) {
          eventName = eventName.replace(new RegExp(` ${value['cityName'].toLowerCase()} `, 'gi'), ' ');
        }
        if (value['countryName']) {
          eventName = eventName.replace(new RegExp(` ${value['countryName'].toLowerCase()} `, 'gi'), ' ');
        }
        if (value['state']) {
          eventName = eventName.replace(new RegExp(` ${value['state'].toLowerCase()} `, 'gi'), ' ');
        }

        // Final cleanup
        const eventNameModified = eventName.trim();
        const finalEventNameArray = eventNameModified.toLowerCase().split(' ');

        // Calculate differences between original and processed names
        const diff1 = this.arrayDifference(origNameArray, finalEventNameArray);
        const diff2 = this.arrayDifference(finalEventNameArray, origNameArray);

        // Set event rule if either difference is empty (exact or subset match)
        if ((diff1.length === 0 || diff2.length === 0) && !eventRuleArray[value['event']]) {
          eventRuleArray[value['event']] = 7;
        }
      }
      blockStatus = -7;
      rule = "7";
    }
    let blockedEvent: object = {};
    if (Object.entries(eventRuleArray).length > 0) {
      {
        const eventIdArray: string[] = Object.keys(eventRuleArray);
        const blockedEventData: object[] = [];
        for (const key in blockedEventData) {
          blockedEvent[key] = blockedEventData[key];
          blockedEvent[key]['rule'] = eventRuleArray[blockedEventData[key]['id']];
        }
      }
    }
    return {
      data: { blocked: blockedEvent }
    };
  }
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
  private replaceAllCaseInsensitive(str: string, search: string[], replacement: string): string {
    let result = str;
    for (const term of search) {
      result = result.replace(new RegExp(term, 'gi'), replacement);
    }
    return result;
  }
  private rad2deg(rad: number): number {
    return rad * (180 / Math.PI);
  }
  private arrayDifference(a: string[], b: string[]): string[] {
    return a.filter(x => !b.includes(x));
  }
  private replaceAll(str: string, search: string[], replacement: string[]): string {
    let result = str;
    for (let i = 0; i < search.length; i++) {
      result = result.split(search[i]).join(replacement[i]);
    }
    return result;
  }

  private async getStopWordsFromS3(): Promise<string[]> {
    const url = 'https://gifbt.s3.amazonaws.com/manage/csv/stop_words_array_spaceList.tsv';

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch stop words: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    return text.split('\n');
  }
  async checkDuplicateEvents(query) {

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
