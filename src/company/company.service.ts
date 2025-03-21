import { Injectable } from '@nestjs/common';
import { EventDataDto } from 'src/events/dto';
import { transformEventData } from 'src/events/global.service';
import { ProspectSchemaDto } from 'src/shared/shared.dto';
import { SharedService } from 'src/shared/shared.service';
import { decrypt, encrypt } from 'src/utils';
import { microserviceEndpoints } from 'src/utils/endpoints';
import { TCachedUser } from 'src/utils/types';

@Injectable()
export class CompanyService {
  constructor(private readonly sharedService: SharedService) { }
  async getCompanyProspectData(query: ProspectSchemaDto, viewAs: string) {
    return await this.sharedService.getCompanyAndUserDataForProspect(
      query,
      viewAs,
      'company',
    );
  }
  async getCompnayEvents(companyId: string, query, userData: TCachedUser) {
    if (query.limit > 20) {
      query.limit = 20;
    }
    companyId = decrypt(companyId).replace(
      process.env.TEN_TIMES_ID_ENCRYPT_KEY as string,
      '',
    );
    const baseURL = process.env.MICROSERVICE_URL || '';
    const endpoint = microserviceEndpoints.company.events.replace(":companyId", companyId);
    const queryString = new URLSearchParams(query).toString();
    const url = `${baseURL}${endpoint}?${queryString}`;
    console.log(url);
    const response = await fetch(url, {
      method: 'GET',
    });
    const data = (await response.json()) as any;
    console.log(data);
    if (!query.groupBy) {
      const responseToReturn: { count: Number; events: any[] } = {
        count: data.data.stats.totalEvents,
        events: data.data.events.map((val: Event) => {
          const dataToCreate: EventDataDto = {
            '10timesEventPageUrl': val.eventWebsite,
            alerts: [],
            categories: val.categories,
            primaryEventType: val.type[0],
            audienceSpread: val.audienceSpread as any,
            audienceZone: null,
            bannerUrl: null,
            createdAt: val.createdAt,
            designations: [],
            description: val.description,
            designationSpread: [],
            economicImpact: '0',
            economicImpactBreakdown: {},
            editions: val.editionCount,
            endDateTime: val.endDate,
            startDateTime: val.startDate,
            entryType: val.entryType,
            estimatedAttendance: 0,
            estimatedAttendanceMean: 0,
            estimatedExhibitors: '0',
            estimatedVisitorRangeTag: '0',
            eventLocation: {
              city: {
                countryId: val.location.countryId,
                id: val.location.cityId,
                name: val.location.cityName,
                latitude: val.location.cityCordinates.latitude,
                longitude: val.location.cityCordinates.longitude,
                locationType: '',
                stateId: '',
              },
              country: {
                id: val.location.countryId,
                name: val.location.countryName,
                latitude: val.location.cityCordinates.latitude,
                longitude: val.location.cityCordinates.longitude,
                regions: [],
                locationType: '',
              },
              state: {
                countryId: val.location.countryId,
                id: '',
                name: '',
                latitude: val.location.cityCordinates.latitude,
                longitude: val.location.cityCordinates.longitude,
                locationType: '',
              },
              venue: {
                address: val.location.venueAddress,
                countryId: val.location.countryId,
                id: '',
                name: val.location.venueName,
                latitude: val.location.geoCordinates.latitude,
                longitude: val.location.geoCordinates.longitude,
                locationType: '',
                stateId: '',
                cityId: '',
                displayName: '',
              },
            },
            eventPageUrl: val.url,
            eventTypes: val.type.map((type) => {
              return {
                id: '',
                name: type,
                slug: type,
                eventGroupType: '',
              };
            }),
            exhibitorsCount: 0,
            format: val.format,
            frequency: '',
            id: val.id,
            isBranded: false,
            isSeries: false,
            lastVerifiedOn: null,
            logoUrl: val.logoUrl,
            maturity: null,
            name: val.name,
            organizer: {
              id: val.organizer.id,
              location: {
                city: {
                  countryId: '',
                  id: '',
                  name: val.organizer.cityName,
                  latitude: '',
                  longitude: '',
                  locationType: '',
                  stateId: '',
                },
                country: {
                  id: '',
                  name: val.organizer.countryName,
                  latitude: '',
                  longitude: '',
                  regions: [],
                  locationType: '',
                },
                address: '',
                state: {
                  countryId: '',
                  id: '',
                  name: '',
                  latitude: '',
                  longitude: '',
                  locationType: '',
                },
              },
              logoUrl: val.organizer.logo,
              name: val.organizer.name,
              totalExhibit: val.organizer.totalExhibit,
              totalOrganize: val.organizer.totalOrganize,
              totalSponsor: val.organizer.totalSponsor,
              totalVisitor: val.organizer.totalVisitor,
              website: val.organizer.website,
            },
            rankings: {
              categories: [],
              category_country: [],
              country: { countryId: '', rank: 0 },
              global: 0,
            },
            rating: 0,
            rehostDate: '',
            rehostScore: 0,
            repeatSentiment: 0,
            reputationScore: 0,
            scores: {
              impactScore: 0,
              inboundScore: 0,
              internationalScore: 0,
              internationalScoreTag: '0',
            },
            speakersCount: 0,
            sponsorsCount: 0,
            status: val.status,
            tags: [],
            tickets: null,
            timings: null,
            trustScore: 0,
            updatedAt: '',
            website: '',
            yoyGrowth: 0,
            trackerMatchInfo: null,
            reputationChangePercentage: 0,
            trustChangePercentage: 0,
            trustChangeTag: null,
            reputationChangeTag: null,
          };
          return transformEventData(dataToCreate);
        }),
      };
      return { data: responseToReturn };
    } else {
      const countryData: { data: Country[] } = { data: data.data };
      return {
        data: countryData.data.map((val) => {
          return {
            count: val.eventCount,
            id: val.countryId,
            name: val.name,
            latitude: val.geoCordinates.latitude,
            longitude: val.geoCordinates.longitude,
            participation: val.participation,
            code: val.countryCode,
          };
        }),
      };
    }
  }
  async getCompanyPoc(companyId: string) {
    companyId = decrypt(companyId).replace(
      process.env.TEN_TIMES_ID_ENCRYPT_KEY as string,
      '',
    );
    const baseURL = process.env.MICROSERVICE_URL || '';
    const endpoint = microserviceEndpoints.company.poc.replace(":companyId", companyId);
    // const queryString = new URLSearchParams(query).toString();
    const url = `${baseURL}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
    });

    // if (!response.ok) {
    //   throw new Error(`Error fetching categories: ${response.statusText}`);
    // }

    const data = await response.json();
    console.log(data, url);

    return {
      data: {
        companyPoc: data.data.companyPoc.map((val) => {
          return {
            ...val,
            id: encrypt(
              (val.id + process.env.TEN_TIMES_ID_ENCRYPT_KEY) as string,
            ),
          };
        }),
      },
    };
  }
}

export interface Event {
  id: string;
  name: string;
  status: string;
  url: string;
  entryType: string | null;
  eventWebsite: string;
  eventZone: string[];
  audienceSpread: Record<string, unknown>;
  audienceZone: string;
  description: string;
  createdAt: string;
  location: {
    cityId: string;
    cityName: string;
    countryId: string;
    cityCordinates: {
      longitude: string;
      latitude: string;
    };
    countryCode: string;
    countryName: string;
    venueName: string;
    venueAddress: string;
    geoCordinates: {
      longitude: string;
      latitude: string;
    };
  };
  stats: {
    score: number;
    eventFollower: number;
    estimatedVisitor: string;
  };
  startDate: string;
  endDate: string;
  duration: string;
  editionCount: number;
  format: string;
  type: string[];
  categories: {
    id: string;
    name: string;
    slug: string;
    isGroup: boolean;
  }[];
  eventKeywords: string[];
  organizer: {
    id: string;
    name: string;
    website: string;
    logo: string | null;
    cityName: string;
    countryName: string;
    totalExhibit: number;
    totalSponsor: number;
    totalVisitor: number;
    totalOrganize: number;
  };
  trackerIntelScore: number | null;
  eventRank: number;
  localRank: number;
  'trustScore%': number;
  logoUrl: string;
  reputationSentiment: number;
  interestsGrowth: number;
  eventSize: string;
  estimatedVisitorRangeTag: string;
  'internationalAudience%': string;
  ticketPriceLink: string | null;
  matchedKeywords: string[];
  keywordsMatchedScore: number;
}

export interface Country {
  countryId: string;
  countryCode: string;
  name: string;
  participation: any;
  eventCount: number;
  countryZone: string;
  geoCordinates: {
    longitude: string;
    latitude: string;
  };
}
