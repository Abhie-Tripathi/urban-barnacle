// createEvent : create a new event
// createEventEdition : create a new event edition
// getAllEvents : get all events

import { HttpException, HttpStatus, Injectable, Req } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as crypto from 'crypto';
import {
  CreateEventDto,
  EventDetailsSchema,
  EventDuplicate_DTO,
  EventSpeakerDto,
  Query_Dto,
  UpdateEventDto,
} from './dto';
import { defaultEventTypes, SelectedUserDetails, TCachedUser } from 'src/utils/types';
import { File } from '@nest-lab/fastify-multer';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { Interest, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PosterService } from './poster.service';
import { FileCreationService } from 'src/shared/file-creation.service';
import { PromotedEventsDataService } from './promoted-even.data.service';
import { fetchDatafromMicroService, postDatafromMicroService } from 'src/shared/microservice.api';
import { unknown } from 'zod';
import { IntentService } from 'src/intent/intent.service';
@Injectable()
export class PromotedEventsService {
  constructor(
    private readonly eventDataService: PromotedEventsDataService,
    private configService: ConfigService,
    private readonly posterService: PosterService,
    private readonly fileCreate: FileCreationService,
    private readonly intentService: IntentService
    // @InjectQueue('eventProcessor') private readonly eventCanelQueue: Queue,
  ) { }

  async processEvent(content: EventDuplicate_DTO, user: TCachedUser) {
    content.name = content.name?.trim();
    // content.website = content.website?.trim();
    const eventRuleArray: Record<number, number> = {};
    let rule = "N-A";
    // Website domain extraction
    // let domain = '';
    // if (content.website) {
    //   domain = content.website;
    // }

    let blockStatus = 1;
    // const eventData = [];
    // let latLong = 1;

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
    if (!content.latitude || !content.longitude) {
      throw new HttpException('latitude and longitude are missing', HttpStatus.FAILED_DEPENDENCY);
    }
    let latitude: number, longitude: number

    latitude = content.latitude;
    longitude = content.longitude;

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

    const andWhere = `( (data ->> 'longitude')::FLOAT > (${minLon}) AND  (data ->> 'longitude')::FLOAT < (${maxLon}) AND (data ->> 'latitude')::FLOAT > (${minLat}) AND (data ->> 'latitude')::FLOAT < (${maxLat}))`;

    const dist: string = `(3959 * acos (cos ( radians(${latitude}) )* cos( radians( (data ->> 'latitude')::FLOAT  ) )* cos( radians(  (data ->> 'longitude')::FLOAT ) - radians(${longitude}) )+ sin ( radians(${latitude}) )* sin( radians( (data ->> 'latitude')::FLOAT  ) )))*1.60934 AS distance, (cos ( radians(${latitude}) )* cos( radians( (data ->> 'latitude')::FLOAT  ) )* cos( radians(  (data ->> 'longitude')::FLOAT ) - radians(${longitude}) )+ sin ( radians(${latitude}) )* sin( radians( (data ->> 'latitude')::FLOAT  ) ))  acosval `;

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
    const cityReplace = await fetchDatafromMicroService('locationSuggestionApi', { id: content.locationIds }) as {
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
    console.log(cityReplace);
    if (cityReplace) {
      origNameModified = origNameModified.replace(new RegExp(` ${cityReplace.data.formattedLocations[0].name.toLowerCase()} `, 'gi'), ' ');
      if (cityReplace.data.formattedLocations[0]?.country)
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
    let flagForRule: boolean = true;
    const whereConditions: string[] = [` "sourceModule"='COORDINATE' `];
    whereConditions.push(andWhere);
    // HAVING condition
    const havingClause = `   where   
          distance <= ${radius} OR
          acosval > 1 OR 
          acosval < -1 
        `;
    // whereLike = whereLike.replace(/^ OR /, '');
    // whereLikeSn = whereLikeSn.replace(/^ OR /, '');
    if (flagForRule && content['name'] && content['name'].length > 0 && !content['venueId'] && content['startDate'] && content['startDate'].length > 0) {


      whereConditions.push(`
        ("name" = '${content.name}')
      `);

      whereConditions.push(`(data->>'start_date')::DATE = '${content.startDate}'`);


      // Exclude condition
      if (content.excludeEventIds) {
        whereConditions.push(`"id" NOT IN (${content.excludeEventIds})`);
      }

      // Combine all conditions
      const whereClause = whereConditions.join(' AND ');

      // Execute raw query with Prisma
      const eventQuery: string = `
      SELECT *
FROM (
     SELECT DISTINCT
    id,
    "name",
    data ->> 'location_country_id' AS "eventCountryId",
    data ->> 'location_city_id' AS "eventCityId",
    data ->> 'location_state_id' as "eventStateId",
    data ->> 'location_state' as "eventState",
    data ->> 'location_city' AS "cityName",
    data ->> 'location_country' AS "countryName",
        ${dist}
      FROM 
        "Event"
      WHERE 
        ${whereClause}
        ) AS subquery

        ${havingClause}
    `;
      const eventData: object[] = await this.eventDataService.checkDuplicate(eventQuery);
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
          .replace(new RegExp(` ${value['eventState']?.toLowerCase() || ''} `, 'gi'), ' ');

        eventNameModified = eventNameModified.trim();

        // Check for exact name match
        if (origName === eventNameModified && !eventRuleArray[value['id']]) {
          eventRuleArray[value['id']] = 1;
        } else if (
          (value['name']?.toLowerCase() === content.name.toLowerCase()) &&
          !eventRuleArray[value['name']]
        ) {
          eventRuleArray[value['id']] = 1;
        }
        console.log(eventRuleArray);
      }

      blockStatus = -1;
      rule = "1";

    }
    if (flagForRule && content['name'] && content['name'].length > 0 && content['endDate'] && content['endDate'].length > 0) {


      whereConditions.push(`
        ("name" = '${content.name}')
      `);

      whereConditions.push(`(data->>'end_date')::DATE = '${content.endDate}'`);


      // Exclude condition
      if (content.excludeEventIds) {
        whereConditions.push(`"id" NOT IN (${content.excludeEventIds})`);
      }

      // Combine all conditions
      const whereClause = whereConditions.join(' AND ');


      // Execute raw query with Prisma
      const eventQuery: string = `
      SELECT *
FROM (
     SELECT DISTINCT
    id,
    "name",
    data ->> 'location_country_id' AS "eventCountryId",
    data ->> 'location_city_id' AS "eventCityId",
    data ->> 'location_state_id' as "eventStateId",
    data ->> 'location_state' as "eventState",
    data ->> 'location_city' AS "cityName",
    data ->> 'location_country' AS "countryName",
        ${dist}
      FROM 
        "Event"
      WHERE 
        ${whereClause}
        ) AS subquery

        ${havingClause}
    `;
      const eventData: object[] = await this.eventDataService.checkDuplicate(eventQuery);
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
          .replace(new RegExp(` ${value['eventState']?.toLowerCase() || ''} `, 'gi'), ' ');

        eventNameModified = eventNameModified.trim();

        // Check for exact name match
        if (origName === eventNameModified && !eventRuleArray[value['id']]) {
          eventRuleArray[value['id']] = 2;
        } else if (
          (value['name']?.toLowerCase() === content.name.toLowerCase()) &&
          !eventRuleArray[value['name']]
        ) {
          eventRuleArray[value['id']] = 2;
        }
      }

      blockStatus = -2;
      rule = "2";

    }
    //     if (flagForRule && content['name'] && content['name'].length > 0) {

    //       whereConditions.push(`
    //         ("name" = '${content.name}')
    //       `);

    //       // Exclude condition
    //       if (content.excludeEventIds) {
    //         whereConditions.push(`"id" NOT IN (${content.excludeEventIds})`);
    //       }

    //       // Combine all conditions
    //       const whereClause = whereConditions.join(' AND ');
    //       // Execute raw query with Prisma
    //       const eventQuery: string = `
    //       SELECT *
    // FROM (
    //      SELECT DISTINCT
    //     id,
    //     "name",
    //     data ->> 'location_country_id' AS "eventCountryId",
    //     data ->> 'location_city_id' AS "eventCityId",
    //     data ->> 'location_state_id' as "eventStateId",
    //     data ->> 'location_state' as "eventState",
    //     data ->> 'location_city' AS "cityName",
    //     data ->> 'location_country' AS "countryName",
    //         ${dist}
    //       FROM 
    //         "Event"
    //       WHERE 
    //         ${whereClause}
    //         ) AS subquery

    //         ${havingClause}
    //     `;
    //       const eventData: object[] = await this.eventDataService.checkDuplicate(eventQuery);[];
    //       // Process event data
    //       for (const value of eventData) {
    //         let eventName = this.replaceAll(value['name'], stopWordsArray, [' ']);
    //         eventName = eventName.replace(/[\d]+/g, '');
    //         eventName = eventName.replace(/\s+/g, ' ').trim();

    //         let eventNameModified = ` ${eventName.toLowerCase()} `;

    //         // Remove stop words
    //         for (const word of stopWordsArraySpace) {
    //           eventNameModified = eventNameModified.replace(new RegExp(` ${word} `, 'gi'), ' ');
    //         }

    //         // Remove location-related words
    //         eventNameModified = eventNameModified
    //           .replace(new RegExp(` ${value['cityName'].toLowerCase()} `, 'gi'), ' ')
    //           .replace(new RegExp(` ${value['countryName'].toLowerCase()} `, 'gi'), ' ')
    //           .replace(new RegExp(` ${value['eventState']?.toLowerCase() || ''} `, 'gi'), ' ');

    //         eventNameModified = eventNameModified.trim();

    //         // Check for exact name match
    //         if (origName === eventNameModified && !eventRuleArray[value['id']]) {
    //           eventRuleArray[value['id']] = 3;
    //         } else if (
    //           (value['name']?.toLowerCase() === content.name.toLowerCase()) &&
    //           !eventRuleArray[value['name']]
    //         ) {
    //           eventRuleArray[value['name']] = 3;
    //         }
    //       }

    //       blockStatus = -3;
    //       rule = "3/4";
    //     }
    // if (flagForRule && content['name'] && content['name'].length > 0 && content['website'] && content['website'].length > 0) {

    //   whereConditions.push(`
    //     (e."name" = '${content.name}') OR 
    //   `);
    //   whereConditions.push(`
    //     (e."hosts" = '${content['website']}')
    //   `);
    //   // Exclude condition
    //   if (content.excludeEventIds) {
    //     whereConditions.push(`er."id" NOT IN (${content.excludeEventIds})`);
    //   }

    //   // Combine all conditions
    //   const whereClause = whereConditions.join(' AND ');

    //   // HAVING condition
    //   const havingClause = `
    //   (
    //   (distance <= ${radius} OR 
    //   distance1 <= ${radius} OR 
    //   acosval > 1 OR 
    //   acosval < -1 OR 
    //   acosval1 > 1 OR 
    //   acosval1 < -1))
    // `;

    //   // Execute raw query with Prisma
    //   const eventQuery: string = `
    //   SELECT 
    //     DISTINCT er."event",
    //     e."name",
    //     e."abbrName" AS "abbrName",
    //     e."multiCity" AS "multici",
    //     er."country" AS "con",
    //     er."city" AS "eventCity",
    //     cit."state",
    //     cit."name" AS "cityName",
    //     country."name" AS "countryName",
    //     ${dist}
    //   FROM 
    //     "EventReplica" er
    //   INNER JOIN 
    //     "Event" e ON e."id" = er."event" AND e."eventType" < 10
    //   LEFT JOIN 
    //     "City" cit ON cit."id" = er."phyCity"
    //   LEFT JOIN 
    //     "Country" country ON country."id" = er."country"
    //   WHERE 
    //     ${whereClause}
    //   HAVING 
    //     ${havingClause}
    // `;
    //   const eventData: object[] = await this.eventDataService.checkDuplicate(eventQuery);[];
    //   // Process event data
    //   for (const value of eventData) {
    //     let eventName = this.replaceAll(value['name'], stopWordsArray, [' ']);
    //     eventName = eventName.replace(/[\d]+/g, '');
    //     eventName = eventName.replace(/\s+/g, ' ').trim();

    //     let eventNameModified = ` ${eventName.toLowerCase()} `;

    //     // Remove stop words
    //     for (const word of stopWordsArraySpace) {
    //       eventNameModified = eventNameModified.replace(new RegExp(` ${word} `, 'gi'), ' ');
    //     }

    //     // Remove location-related words
    //     eventNameModified = eventNameModified
    //       .replace(new RegExp(` ${value['cityName'].toLowerCase()} `, 'gi'), ' ')
    //       .replace(new RegExp(` ${value['countryName'].toLowerCase()} `, 'gi'), ' ')
    //       .replace(new RegExp(` ${value['state']?.toLowerCase() || ''} `, 'gi'), ' ');

    //     eventNameModified = eventNameModified.trim();

    //     // Check for exact name match
    //     if (origName === eventNameModified && !eventRuleArray[value['event']]) {
    //       eventRuleArray[value['event']] = 4;
    //     } else if (
    //       (value['name']?.toLowerCase() === content.name.toLowerCase()) &&
    //       !eventRuleArray[value['name']]
    //     ) {
    //       eventRuleArray[value['name']] = 4;
    //     }
    //   }

    //   blockStatus = -4;
    //   rule = "4";
    // }
    //     if (origName && origName.length > 0) {

    //       whereConditions.push(`
    //         ("name" = '${content.name}')
    //       `);
    //       // Exclude condition
    //       if (content.excludeEventIds) {
    //         whereConditions.push(`"id" NOT IN (${content.excludeEventIds})`);
    //       }

    //       // Combine all conditions
    //       const whereClause = whereConditions.join(' AND ');

    //       // Execute raw query with Prisma
    //       const eventQuery: string = `
    //       SELECT *
    // FROM (
    //      SELECT DISTINCT
    //     id,
    //     "name",
    //     data ->> 'location_country_id' AS "eventCountryId",
    //     data ->> 'location_city_id' AS "eventCityId",
    //     data ->> 'location_state_id' as "eventStateId",
    //     data ->> 'location_state' as "eventState",
    //     data ->> 'location_city' AS "cityName",
    //     data ->> 'location_country' AS "countryName",
    //         ${dist}
    //       FROM 
    //         "Event"
    //       WHERE 
    //         ${whereClause}
    //         ) AS subquery

    //         ${havingClause}
    //     `;
    //       const eventData: object[] = await this.eventDataService.checkDuplicate(eventQuery);[];
    //       // Process event data
    //       for (const value of eventData) {
    //         // Replace special characters in the name
    //         let processedName = this.replaceAll(value['name'], searchOrigWithSpace, replaceOrigWithSpace);

    //         // Remove stop words (case insensitive)
    //         console.log(processedName, stopWordsArray)
    //         processedName = this.replaceAllCaseInsensitive(processedName, stopWordsArray, ' ');

    //         // Remove numbers and extra spaces
    //         processedName = processedName.replace(/[\d]+/g, '')
    //           .replace(/\s+/g, ' ')
    //           .trim();

    //         // Convert to lowercase and split into words
    //         const eventNameArray = processedName.toLowerCase().split(' ');

    //         // Process the name with space padding for whole word matching
    //         let eventName = ` ${processedName.toLowerCase()} `;

    //         // Remove stop words (space-padded version)
    //         for (const stopWord of stopWordsArraySpace) {
    //           eventName = eventName.replace(new RegExp(` ${stopWord} `, 'gi'), ' ');
    //         }

    //         // Remove location-related words
    //         if (value['cityName']) {
    //           eventName = eventName.replace(new RegExp(` ${value['cityName'].toLowerCase()} `, 'gi'), ' ');
    //         }
    //         if (value['countryName']) {
    //           eventName = eventName.replace(new RegExp(` ${value['countryName'].toLowerCase()} `, 'gi'), ' ');
    //         }
    //         if (value['eventState']) {
    //           eventName = eventName.replace(new RegExp(` ${value['eventState'].toLowerCase()} `, 'gi'), ' ');
    //         }

    //         // Final cleanup
    //         const eventNameModified = eventName.trim();
    //         const finalEventNameArray = eventNameModified.toLowerCase().split(' ');

    //         // Calculate differences between original and processed names
    //         const diff1 = this.arrayDifference(origNameArray, finalEventNameArray);
    //         const diff2 = this.arrayDifference(finalEventNameArray, origNameArray);

    //         // Set event rule if either difference is empty (exact or subset match)
    //         if ((diff1.length === 0 || diff2.length === 0) && !eventRuleArray[value['id']]) {
    //           eventRuleArray[value['id']] = 5;
    //         }
    //       }
    //       blockStatus = -5;
    //       rule = "5";
    //     }
    //     if (origName && origName.length > 0) {
    //       ///&& content['website'] && content['website'].length > 0
    //       whereConditions.push(`
    //         ("name" = '${content.name}')
    //       `);
    //       // whereConditions.push(`
    //       //   (e."hosts" = '${content.hosts}')
    //       // `);
    //       // Exclude condition
    //       if (content.excludeEventIds) {
    //         whereConditions.push(`"id" NOT IN (${content.excludeEventIds})`);
    //       }

    //       // Combine all conditions
    //       const whereClause = whereConditions.join(' AND ');

    //       // Execute raw query with Prisma
    //       const eventQuery: string = `
    //       SELECT *
    // FROM (
    //      SELECT DISTINCT
    //     id,
    //     "name",
    //     data ->> 'location_country_id' AS "eventCountryId",
    //     data ->> 'location_city_id' AS "eventCityId",
    //     data ->> 'location_state_id' as "eventStateId",
    //     data ->> 'location_state' as "eventState",
    //     data ->> 'location_city' AS "cityName",
    //     data ->> 'location_country' AS "countryName",
    //         ${dist}
    //       FROM 
    //         "Event"
    //       WHERE 
    //         ${whereClause}
    //         ) AS subquery

    //         ${havingClause}
    //     `;
    //       const eventData: object[] = await this.eventDataService.checkDuplicate(eventQuery);[];
    //       // Process event data
    //       for (const value of eventData) {
    //         // Replace special characters in the name
    //         let processedName = this.replaceAll(value['name'], searchOrigWithSpace, replaceOrigWithSpace);

    //         // Remove stop words (case insensitive)
    //         processedName = this.replaceAllCaseInsensitive(processedName, stopWordsArray, ' ');

    //         // Remove numbers and extra spaces
    //         processedName = processedName.replace(/[\d]+/g, '')
    //           .replace(/\s+/g, ' ')
    //           .trim();

    //         // Convert to lowercase and split into words
    //         const eventNameArray = processedName.toLowerCase().split(' ');

    //         // Process the name with space padding for whole word matching
    //         let eventName = ` ${processedName.toLowerCase()} `;

    //         // Remove stop words (space-padded version)
    //         for (const stopWord of stopWordsArraySpace) {
    //           eventName = eventName.replace(new RegExp(` ${stopWord} `, 'gi'), ' ');
    //         }

    //         // Remove location-related words
    //         if (value['cityName']) {
    //           eventName = eventName.replace(new RegExp(` ${value['cityName'].toLowerCase()} `, 'gi'), ' ');
    //         }
    //         if (value['countryName']) {
    //           eventName = eventName.replace(new RegExp(` ${value['countryName'].toLowerCase()} `, 'gi'), ' ');
    //         }
    //         if (value['eventState']) {
    //           eventName = eventName.replace(new RegExp(` ${value['eventState'].toLowerCase()} `, 'gi'), ' ');
    //         }

    //         // Final cleanup
    //         const eventNameModified = eventName.trim();
    //         const finalEventNameArray = eventNameModified.toLowerCase().split(' ');

    //         // Calculate differences between original and processed names
    //         const diff1 = this.arrayDifference(origNameArray, finalEventNameArray);
    //         const diff2 = this.arrayDifference(finalEventNameArray, origNameArray);

    //         // Set event rule if either difference is empty (exact or subset match)
    //         if ((diff1.length === 0 || diff2.length === 0) && !eventRuleArray[value['id']]) {
    //           eventRuleArray[value['id']] = 6;
    //         }
    //       }
    //       blockStatus = -6;
    //       rule = "6";
    //     }
    console.log('origName=>>>>>>', origName,)
    if (origName && origName.length > 0 && content['venueId'] && content['startDate'] && content['startDate'].length > 0) {
      console.log('origName=>>>>>>', origName,)
      whereConditions.push(`
        ("name" = '${content.name}')
      `);
      whereConditions.push(`
        (data->>'venue_id' = '${content.venueId}')
      `);
      whereConditions.push(`(data->>'start_date')::DATE = '${content.startDate}'`);

      // Exclude condition
      if (content.excludeEventIds) {
        whereConditions.push(`"id" NOT IN (${content.excludeEventIds})`);
      }

      // Combine all conditions
      const whereClause = whereConditions.join(' AND ');

      // Execute raw query with Prisma
      const eventQuery: string = `
      SELECT *
FROM (
     SELECT DISTINCT
    id,
    "name",
    data ->> 'location_country_id' AS "eventCountryId",
    data ->> 'location_city_id' AS "eventCityId",
    data ->> 'location_state_id' as "eventStateId",
    data ->> 'location_state' as "eventState",
    data ->> 'location_city' AS "cityName",
    data ->> 'location_country' AS "countryName",
        ${dist}
      FROM 
        "Event"
      WHERE 
        ${whereClause}
        ) AS subquery

        ${havingClause}
    `;
      const eventData: object[] = await this.eventDataService.checkDuplicate(eventQuery);[];
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
        if (value['eventState']) {
          eventName = eventName.replace(new RegExp(` ${value['eventState'].toLowerCase()} `, 'gi'), ' ');
        }

        // Final cleanup
        const eventNameModified = eventName.trim();
        const finalEventNameArray = eventNameModified.toLowerCase().split(' ');

        // Calculate differences between original and processed names
        const diff1 = this.arrayDifference(origNameArray, finalEventNameArray);
        const diff2 = this.arrayDifference(finalEventNameArray, origNameArray);

        // Set event rule if either difference is empty (exact or subset match)
        if ((diff1.length === 0 || diff2.length === 0) && !eventRuleArray[value['id']]) {
          eventRuleArray[value['id']] = 7;
        }
      }
      blockStatus = -7;
      rule = "7";
    }
    let blockedEvent: object[] = [];
    let index = 0;
    if (Object.entries(eventRuleArray).length > 0) {
      {
        const eventIdArray: string[] = Object.keys(eventRuleArray);
        const blockedEventData = await this.eventDataService
          .findManyPromotedEvents(user.accountId, ` and  id in ('${eventIdArray.join("','")}')`,
            "e.\"createdAt\"", 'desc', String(eventIdArray.length), '0');
        console.log('eventRuleArray', eventRuleArray, blockedEventData);
        for (const key of blockedEventData) {
          blockedEvent[index] = key;
          blockedEvent[index]['rule'] = eventRuleArray[key['id']];
          index++;
        }
      }
    }
    return {
      blocked: blockedEvent.length > 0 ? this.transformResult(blockedEvent) : []
    };
  }
  private transformResult(data: object[]) {
    return data.map(val => {
      const eventData = val['data'];
      return {
        id: val['id'],
        "name": val['name'],
        "startDate": eventData['start_date'],
        "endDate": eventData['end_date'],
        "venueName": eventData['venue_name'] || null,
        "cityName": eventData['location_city'],
        "state": eventData['location_state'],
        "countryId": eventData['location_country_iso_code'],
        "countryName": eventData['location_country'],
        "companyName": null,
        "eventType": eventData['event_type'].split(','),
        rule: val['rule'],
        isProductEvent: true
      }
    })
  }
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
  private escapeRegExp(term: string): string {
    return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private replaceAllCaseInsensitive(str: string, search: string[], replacement: string): string {
    let result = str;
    for (const term of search) {
      const escapedTerm = this.escapeRegExp(term);
      result = result.replace(new RegExp(escapedTerm, 'gi'), replacement);
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
  async checkDuplicateEvents(body: EventDuplicate_DTO, user: TCachedUser) {
    const dataForBloack = await Promise.all([this.processEvent(body, user),
    postDatafromMicroService('findDuplicateEvent',
      {
        ...body, ...(body.excludeEventIds ?
          { excludeEventIds: body.excludeEventIds.replaceAll("','", ',') } : {})
      })
    ]);
    const localDbEventBlocked: object[] = dataForBloack[0].blocked;
    const duplicateEventFrom10times: {
      "data": {
        "blocked": object[],
        "review": object[]
      }
    } = dataForBloack[1];
    console.log(duplicateEventFrom10times);
    console.log({ localDbEventBlocked, duplicateEventFrom10times });
    return { data: { blocked: [...localDbEventBlocked, ...duplicateEventFrom10times.data?.blocked], review: duplicateEventFrom10times.data?.review } }
  }
  async getGeniEventById(id: string) {
    try {
      const { data, iddWid, widgetData } =
        await this.eventDataService.getEventForGeni(id);
      if (!data) {
        throw new HttpException('event not fount', HttpStatus.NOT_FOUND);
      }
      const eventData: any = data?.data;
      eventData['customizationData'] = JSON.parse(
        eventData['customizationData'],
      );
      return {
        data: {
          ...data,
          data: eventData,
          widgetData: widgetData,
        },
      };
    } catch (error) {
      return { error };
    }
  }
  // async getEventById(id: string, query) {
  //   try {
  //     if (query.source === 'eventgeni') {
  //       return await this.geniEventById(id);
  //     }
  //     // const baseURL = this.configService.get('MICROSERVICE_URL') || '';
  //     // const endpoint = '/event';
  //     // const queryString = new URLSearchParams(query).toString();
  //     // const url = `${baseURL}${endpoint}/${id}?${queryString}`;
  //     // try {
  //     //   const response = await fetch(url, {
  //     //     method: 'GET',
  //     //   });

  //     //   // if (!response.ok) {
  //     //   //   throw new Error(`Error fetching categories: ${response.statusText}`);
  //     //   // }

  //     //   const data = await response.json();
  //     //   return data;
  //     // } catch (error) {
  //     //   console.error('Error fetching categories:', error);
  //     //   // throw error;
  //     // }
  //   } catch (error: any) {
  //     throw new HttpException('something went wrong', HttpStatus.BAD_REQUEST);
  //   }
  // }



  async createEvent(
    body: CreateEventDto,
    file: File,
    user: TCachedUser,
  ) {
    try {
      // let jsonDta = {};
      let attachment_id: string | null = null;
      let jsonDta = EventDetailsSchema.parse(JSON.parse(body.data));
      console.log('file', { ...file });

      if (file.buffer) {
        const fileName =
          randomUUID() +
          file.originalname.substring(file.originalname.lastIndexOf('.'));
        const { fileData } = await this.fileCreate.createFile(
          fileName,
          file,
          user.id,
          'IMAGE',
          'PROMOTED_EVENT',
          'EVENT',
        );
        jsonDta['logoUrl'] = fileData!.fileUrl;
        attachment_id = fileData!.id;
      }
      if (body.logoUrl) {
        const response = await fetch(body.logoUrl);

        if (!response.ok) {
          throw new HttpException(`Failed to fetch image. Status: ${response.status}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const fileName = `${randomUUID() + new Date().toISOString()}.jpg`; // or any other logic to generate file name
        // const filePath = join(__dirname, '..', 'uploads', fileName);
        const mediaHost = this.configService.get('MEDIA_STORAGE_DOMAIN') ?? '';
        const dir = './public/temp/';
        const writer = fs.createWriteStream(dir + fileName);
        // response.body?.
        console.log();
        const picData = await response.arrayBuffer();
        if (picData !== undefined) {
          const buffer = Buffer.from(picData);
          await fs.promises.writeFile(dir + fileName, buffer);
          const filetype = 'IMAGE';
          const upload = await this.eventDataService.createAttachement({
            fileName: body.logoUrl,
            fileType: filetype,
            fileSize: buffer.length / 1024,
            fileUrl: mediaHost + '/public/' + fileName,
            sourceModule: 'PROMOTED_EVENT',
            sourceId: 'EVENT',
            createdByUser: { connect: { id: user.id } },
          });
          attachment_id = upload.id;
          jsonDta['logoUrl'] = upload.fileUrl;
          attachment_id = upload.id;
          // return upload;
        }
      }
      const eventBody: object = {};
      if (body.approval) {
        eventBody['approval'] = body.approval === 'true' ? true : false;
      }
      if (body.capacity) {
        eventBody['capacity'] = parseInt(body.capacity, 10);
        jsonDta['maxCapacity'] = parseInt(body.capacity, 10);
      }
      if (body.registration) {
        eventBody['registration'] = body.registration === 'true' ? true : false;
      }
      if (body.waitlisting) {
        eventBody['waitlisting'] = body.waitlisting === 'true' ? true : false;
      }

      if (body.type && body.type.toUpperCase() === 'CHILD' && body.eventId) {
        eventBody['parentEventId'] = body.eventId;
      }
      // jsonDta['userInfo'] = user;
      const data = await this.eventDataService.createPromotedEvent({
        name: body.name,
        data: jsonDta,
        accountId: user.accountId,
        attachmentId: attachment_id,
        createdBy: user.id,
        type: body.type,
        sourceModule: body.sourceModule,
        ...eventBody,
      });
      this.createPoster(
        data.name,
        jsonDta['logoUrl'] as string,
        jsonDta.participationType ?? '',
        data.id,
      );
      if (body.sourceModule && body.sourceModule === 'COORDINATE' && body.interest) {
        await this.intentService.createUserEventInterest(user, { eventId: data.id, sourceModule: 'PROMOTED_EVENT', interest: body.interest, accountId: user.accountId, interestedUserId: user.id })
      }
      return { data: { message: 'event added', data: data } };
    } catch (error) {
      console.error(error);
      return { error };
    }
  }
  async createPoster(
    name: string,
    imageUrl: string,
    participationType: string,
    eventId: string,
  ) {
    try {
      console.log(name, imageUrl, participationType, eventId);

      const data = await this.posterService.generateCustomPoster(
        name,
        imageUrl,
        participationType,
      );
      // console.log(data);
      const eventData = await this.eventDataService.findUniquePromotedEvent({
        id: eventId,
      });
      const objectBodyForEvent: object = { ...(eventData?.data as object) };
      objectBodyForEvent['posterLink'] = data;
      await this.eventDataService.updatePromotedEvent(
        {
          data: objectBodyForEvent,
        },
        eventId,
      );
      // console.log({ objectBodyForEvent });
    } catch (error) {
      console.error('' + error);
      return { error };
    }
  }
  escapeSqlString(value: string): string {
    return value.replace(/'/g, "''");
  }
  async getEvent(user: TCachedUser, query: Query_Dto) {
    try {
      if (query.views === 'suggestion') {
        return await this.getEventSuggestion(query, user);
      }
      let where: string = `  and "sourceModule"= '${query.source}' `;
      if (query.id) {
        where += ` and e.id in ('${query.id.split("','")}') `;
      }
      if (query.name) {
        const redefine: string[] =
          this.escapeSqlString(query.name).split(',') || [];
        for (const data of redefine) {
          where += ` and lower(e.name) like '%${data.toLowerCase()}%'`;
        }
      }
      if (query.eventIds) {
        where += ` and id in ('${query.eventIds.join("','")}')  `;
      }
      if (query.event_type) {
        where += ` and lower(e.data->>'event_type')
         in ('${query.event_type.toLowerCase().split(',').join("','")}') `;
      }
      if (query.participationType) {
        where += ` and lower(e.data->>'participationType') 
        in ('${query.participationType.toLowerCase().split(',').join("','")}') `;
      }
      if (
        !query.views &&
        !query.calendarType &&
        query.start_date &&
        query.end_date
      ) {
        where += ` AND (
          ((e.data->>'start_date')::DATE <= '${new Date(query.end_date).toISOString()}' 
          AND (e.data->>'end_date')::DATE >= '${new Date(query.start_date).toISOString()}')
          OR ((e.data->>'start_date')::DATE = (e.data->>'end_date' )::DATE
          AND ( e.data->>'start_date')::DATE = '${new Date(query.start_date).toISOString()}')
        ) `;
      }

      if (query.upcoming) {
        where += ` AND (
    (e.data->>'start_date')::DATE >= CURRENT_DATE
    OR (
        CURRENT_DATE BETWEEN (e.data->>'start_date')::DATE 
                        AND (e.data->>'end_date')::DATE
    )
)`;
      }
      if (!query.sortBy && !query.sortType) {
        query.sortBy = ` "createdAt" `;
        query.sortType = ' desc ';
      } else {
        query.sortBy = ` e.data->>'${query.sortBy}' `;
      }
      if (query.expired) {
        where += ` and (e.data->>'end_date')::DATE < '${new Date(query.expired).toISOString()}' `;
      }
      if (
        query.views &&
        query.views === 'calendar' &&
        query.start_date &&
        query.end_date &&
        query.widgetId &&
        query.calendarType
      ) {
        return await this.eventDataService.calendarView(
          query.end_date,
          query.start_date,
          query.widgetId,
          query.calendarType,
          user.accountId,
          where,
        );
      }
      console.log(where);

      const [count, data] = await Promise.all([
        this.eventDataService.findCountOfPromotedEvents(user.accountId, where),
        this.eventDataService.findManyPromotedEvents(
          user.accountId,
          where,
          query.sortBy,
          query.sortType ?? 'asc',
          query.limit + '',
          query.offset + '',
        ),
      ]);
      // if (subEentId.length > 0) {
      //   where += ` and e.id not in ('${subEentId.map((val) => val.subEventId).join("','")}') `;
      // }
      const subEentId = await this.eventDataService.findManyChildPromotedEvent(
        data.map((val) => val.id),
        user.accountId,
      );
      // console.log('count', count[0].id, data, subEentId);
      const outData: any[] = [];
      for (const ids of data) {
        const subEventIdsFromdata: string[] = [];
        for (const sub of subEentId) {
          if (sub.parentEventId === ids.id) {
            subEventIdsFromdata.push(sub.id);
          }
        }

        // console.log('logs', subEventIdsFromdata);
        const { childSubEvent, iddWid, isLinked, widgetData } =
          await this.eventDataService.getLinkedEventData(
            query.widgetId,
            ids.id,
            subEventIdsFromdata,
          );
        const eventAllData: any = { ...ids };
        eventAllData['data']['customizationData'] = eventAllData['data'][
          'customizationData'
        ]
          ? JSON.parse(eventAllData['data']['customizationData'])
          : {};
        const datachildSubEventConvert: any = [];
        for (const child of childSubEvent) {
          const chileLinkedToWidget =
            await this.eventDataService.getCountForChildEventForWidget(
              query.widgetId,
              child.id,
            );
          const data: any = child.data;
          data['customizationData'] = data['customizationData']
            ? JSON.parse(data['customizationData'])
            : {};
          datachildSubEventConvert.push({
            ...child,
            data: data,
            isWidgetLinked:
              Number(chileLinkedToWidget[0].id) > 0 ? true : false,
          });
          // console.log({ datachildSubEventConvert })
        }
        const infinity: boolean =
          eventAllData.capacity === -1 && eventAllData.data.maxCapacity == -1;
        outData.push({
          ...eventAllData,
          infinity: infinity,
          widgetData: widgetData,
          children: datachildSubEventConvert,
          isWidgetLinked: Number(isLinked[0].id) > 0 ? true : false,
        });
      }
      // console.log('count', count);

      return { data: { totalCount: Number(count[0]?.id ?? 0), data: outData } };
    } catch (error) {
      console.log(error);
      console.error(error);
      return { error };
    }
  }

  async createEventSpeaker(
    body: EventSpeakerDto,
    file: File,
    user: SelectedUserDetails,
  ) {
    try {
      let attachment_id: string | null = null;
      if (file) {
        const fileName =
          randomUUID() +
          file.originalname.substring(file.originalname.lastIndexOf('.'));
        const { fileData } = await this.fileCreate.createFile(
          fileName,
          file,
          user.id,
          'IMAGE',
          body.isExhibitor && body.isExhibitor.length > 2 ? 'PROMOTED_EVENT_EXHIBITOR' : 'PROMOTED_EVENT_SPEAKER',
          'EVENT',
        );
        attachment_id = fileData!.fileUrl;
      }
      const interest: object = { interest: 'SPEAKER' };
      if (body.isExhibitor) {
        interest['interest'] = 'EXHIBITOR';
      }
      // const participationType = await this.prisma.userInterest.create({
      //   data: {
      //     ...interest,
      //     entityId: body.eventId,
      //     source: 'eventgeni/widget/event',
      //     sorceId: body.eventId,
      //     userId: user.id,
      //     companyId: user.companyId,
      //     Note: body.data,
      //   },
      // });
      const eventdata = await this.eventDataService.findUniquePromotedEvent({
        id: body.eventId,
      });
      if (eventdata) {
        const data: any = eventdata?.data;
        console.log(
          { data: eventdata?.data ?? {} },
          { data22: eventdata?.data?.['customizationData'] },
        );

        let custData: any = JSON.parse(eventdata?.data?.['customizationData']);
        if (body.isExhibitor) {
          if (!custData['exhibitor']) {
            custData['exhibitor'] = [];
          }
          custData['exhibitor'].push({
            data: body.data,
            interest: 'EXHIBIT',
            imageUrl: attachment_id,
          });
          data['customizationData'] = JSON.stringify(custData);
        } else {
          if (!custData['speaker']) {
            custData['speaker'] = [];
          }
          custData['speaker'].push({
            data: body.data,
            interest: 'SPEAK',
            imageUrl: attachment_id,
          });
          data['customizationData'] = JSON.stringify(custData);
        }
        await this.eventDataService.updatePromotedEvent(
          { data: data },
          body.eventId,
        );
      }
      return {
        data: {
          [body.isExhibitor && body.isExhibitor.length > 2 ? 'exhibitor' : "speaker"]: {
            data: body.data,
            interest: body.isExhibitor && body.isExhibitor.length > 2 ? 'EXHIBIT' : 'SPEAK',
            imageUrl: attachment_id,
          },
        },
      };
    } catch (error) {
      console.log(error);
      console.error(error);
      return { error };
    }
  }
  async updateEvent(
    body: UpdateEventDto,
    file: File,
    user: SelectedUserDetails,
  ) {
    try {
      let postCallFlag: boolean = false;
      const eventDta = await this.eventDataService.getEventCreator(body.id);
      let attachment_id: string | null = null;
      let jsonDta = { data: {} };
      const eventBody: object = {};
      if (body.data) {
        jsonDta['data'] = JSON.parse(body.data);
        if (
          (eventDta?.data as any)['participationType'] !==
          jsonDta['data']['participationType']
        ) {
          postCallFlag = true;
        }
      }
      if (!body.data) {
        jsonDta['data'] = eventDta?.data as any;
        // initalmaxCapacity = jsonDta['data']['maxCapacity'];
      }
      if (body.maxCapacity) {
        let maxCapacity: number = parseInt(body.maxCapacity, 10);
        let initalmaxCapacity: number =
          ((eventDta?.data as any)['maxCapacity'] ?? 0) === -1
            ? 0
            : ((eventDta?.data as any)['maxCapacity'] ?? 0);
        jsonDta['data']['maxCapacity'] = maxCapacity;
        let currectCapacioty: number = eventDta?.capacity ?? 0;
        currectCapacioty =
          currectCapacioty < 0 ? currectCapacioty + 1 : currectCapacioty;
        if (maxCapacity !== -1) {
          eventBody['capacity'] =
            maxCapacity - initalmaxCapacity + currectCapacioty;
          // console.log(
          //   { maxCapacity },
          //   { initalmaxCapacity },
          //   {
          //     event: currectCapacioty,
          //   },
          //   {
          //     diff: maxCapacity - initalmaxCapacity + currectCapacioty,
          //   },
          // );
          // console.log(1, { eventBody });
        } else {
          // console.log(2, { eventBody });
          eventBody['capacity'] = -1;
        }
      }
      // console.log({ eventBody });

      if (file.buffer) {
        const fileName =
          randomUUID() +
          file.originalname.substring(file.originalname.lastIndexOf('.'));
        const { fileData } = await this.fileCreate.createFile(
          fileName,
          file,
          user.id,
          'IMAGE',
          'EVENT',
          'EVENT',
        );
        jsonDta['data']['logoUrl'] = fileData!.fileUrl;
        jsonDta['atachmentId'] = fileData!.id;
        postCallFlag = true;
      }
      if (body.logoUrl) {
        const response = await fetch(body.logoUrl);

        if (!response.ok) {
          throw new HttpException(`Failed to fetch image. Status: ${response.status}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const fileName = `${randomUUID() + new Date().toISOString()}.jpg`; // or any other logic to generate file name
        // const filePath = join(__dirname, '..', 'uploads', fileName);
        const mediaHost = this.configService.get('MEDIA_STORAGE_DOMAIN') ?? '';
        const dir = './public/temp/';
        const writer = fs.createWriteStream(dir + fileName);
        // response.body?.
        console.log();
        const picData = await response.arrayBuffer();
        if (picData !== undefined) {
          const buffer = Buffer.from(picData);
          await fs.promises.writeFile(dir + fileName, buffer);
          const filetype = 'IMAGE';
          const upload = await this.eventDataService.createAttachement({
            fileName: body.logoUrl,
            fileType: filetype,
            fileUrl: mediaHost + '/public/' + fileName,
            fileSize: 0,
            sourceModule: 'EVENT',
            sourceId: 'EVENT',
            createdByUser: { connect: { id: user.id } },
          });
          jsonDta['data']['attachmentId'] = upload.id;
          jsonDta['data']['logoUrl'] = upload.fileUrl;
          // return upload;
          postCallFlag = true;
        }
      }
      if (body.name) {
        jsonDta['name'] = body.name;
        postCallFlag = true;
      }
      if (body.approval) {
        eventBody['approval'] = body.approval === 'true' ? true : false;
      }
      if (body.capacity) {
        eventBody['capacity'] = parseInt(body.capacity, 10);
      }
      if (body.registration) {
        eventBody['registration'] = body.registration === 'true' ? true : false;
      }
      if (body.waitlisting) {
        eventBody['waitlisting'] = body.waitlisting === 'true' ? true : false;
      }
      // jsonDta['data']['userInfo'] = user;
      console.log({ eventBody });

      const data = await this.eventDataService.updatePromotedEvent(
        { ...jsonDta, ...eventBody },
        body.id,
      );
      if (postCallFlag) {
        this.createPoster(
          data.name,
          (data.data as any)['logoUrl'],
          (data.data as any)['participationType'],
          data.id,
        );
      }
      // if (data.data) {
      //   delete data.data['userInfo'];
      // }
      return { data: { message: 'event updated', data: data } };
    } catch (error) {
      console.log(error);
      console.error(error);
      return { error };
    }
  }
  async getEventSuggestion(query: Query_Dto, user: SelectedUserDetails) {
    try {
      const proEvent: {
        id: string;
        name: string;
        data: Record<any, any>;
        isUsed?: boolean;
      }[] = [];
      const data = this.escapeSqlString(query.name?.toLowerCase() ?? '')
        .split(',')
        .map((val) => {
          return ` lower(name) like '${val}%' `;
        });
      const productDbEventCount =
        await this.eventDataService.findCountOfPromotedEvents(
          user.accountId,
          'and ' + data.join('and'),
        );
      const productDbEvent = await this.eventDataService.findManyPromotedEvents(
        user.accountId,
        'and ' + data.join('and'),
        query.sortBy ?? 'e.name',
        query.sortType ?? 'asc',
        query.limit + '',
        query.offset + '',
      );
      if (productDbEvent.length > 0 && query.widgetId) {
        console.log(
          'productDbEvent.map((val) => val.id)',
          productDbEvent.map((val) => val.id),
        );
        const widgetEvent =
          await this.eventDataService.getWidgetIdLinkedWithEvent(
            query.widgetId,
            productDbEvent.map((val) => val.id).join("','"),
          );
        for (const val of productDbEvent) {
          let temp: boolean = false;
          for (const ids of widgetEvent) {
            if (val.id === ids.id) {
              temp = true;
              break;
            }
          }
          proEvent.push({ ...val, isUsed: temp });
        }
      } else {
        proEvent.push(...productDbEvent);
      }
      let eventTypes: string = '';
      const backend = process.env.BACKEND;
      if (backend && backend in defaultEventTypes) {
        eventTypes = Object.values(defaultEventTypes[backend]).join(',');
      }
      const referenceIds: string = productDbEvent.map(val => val.referenceId).filter(val => val).join(',');
      const limitReaming = query.limit - productDbEvent.length;
      const microServiceEvent = await fetchDatafromMicroService('eventSuggestionsFetch', {
        view: 'promote',
        showValues: 'basic',
        limit: limitReaming,
        ...(referenceIds.length > 5 ? { notEventIds: referenceIds } : {}),
        eventTypes: eventTypes
      });

      // (await this.search(
      //   {
      // max: limitReaming + '',
      // eventName: query.name,
      // widget: 'y',
      // eventNameExcept: productDbEvent.map((val) => val.name).join(','),
      //   },
      //   '',
      // )) as { data: { events: any[]; count: number } };
      // console.log(
      //   'productDbEvent',
      //   productDbEvent,
      //   microServiceEvent?.data?.count ?? 0,
      //   Number(productDbEventCount[0].id),
      // );

      return {
        data: {
          totalEvents:
            (microServiceEvent?.data?.count ?? 0) +
            Number(productDbEventCount[0].id),
          events: [...proEvent, ...microServiceEvent.data.events],
        },
      };
    } catch (error) {
      console.log(error);
      console.error(error);
      return { error };
    }
  }
  async deletePromotedEvent(eventId: string, user: TCachedUser) {
    try {
      const deletePromotedEvent =
        await this.eventDataService.updatePromotedEvent(
          {
            deleted: true,
          },
          eventId,
        );
      const jobPayLoad: any = {
        email: (
          await this.eventDataService.getUserRegisteredForPromotedEvent(
            user.accountId,
            eventId,
          )
        ).map((interest) => interest.interestedUser.email),
        eventName: deletePromotedEvent.name,
        userId: user.id,
        userEmail: user.email,
        sourceId: eventId
      };
      this.eventDataService.createEventCancelJob(jobPayLoad, user.id);
      await this.eventDataService.deletePromotedEvent(eventId);
      return { data: { message: 'promoted-event deleted' } };
    } catch (error) {
      console.log(error);
      console.error(error);
      return { error };
    }
  }
}
