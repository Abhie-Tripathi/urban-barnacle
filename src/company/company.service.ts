import { Injectable } from '@nestjs/common';
import { EventDataDto } from 'src/events/dto';
import { transformEventData } from 'src/events/global.service';
import { LimitDto } from 'src/global_dto';
import { IntentDataService } from 'src/intent/intent.data.service';
import { ProspectSchemaDto } from 'src/shared/shared.dto';
import { SharedService } from 'src/shared/shared.service';
import { decrypt, encrypt } from 'src/utils';
import { microserviceEndpoints } from 'src/utils/endpoints';
import { defaultEventTypes, TCachedUser } from 'src/utils/types';

@Injectable()
export class CompanyService {
  constructor(private readonly sharedService: SharedService,
    private readonly intentDataService: IntentDataService,
  ) { }
  async getCompanyProspectData(query: ProspectSchemaDto, viewAs: string) {
    return await this.sharedService.getCompanyAndUserDataForProspect(
      query,
      viewAs,
      'company',
    );
  }
  async getSavedCompanies(query: LimitDto, userData: TCachedUser,) {
    const [savedCompanies, count] = await Promise.all([
      this.intentDataService.getUserEventInterest({
        interest: ['BOOKMARK'],
        sourceModule: { in: ['RESEARCH_COMPANY'] },
        accountId: userData.accountId,
        limit: query.limit,
        offset: query.offset,
      }),
      this.intentDataService.getUserEventInterestCountForBookmark({
        interest: ['BOOKMARK'],
        sourceModule: { in: ['RESEARCH_COMPANY'] },
        accountId: userData.accountId,
        limit: query.limit,
        offset: query.offset,
      }),
    ]);

    const cache: object = {};
    const savedCompaniesIds = savedCompanies.map((item) => {
      cache[item.eventId] = { [item.interest.toLowerCase()]: { interestId: item.id } };
      return item.eventId;
    });

    if (savedCompaniesIds.length === 0) {
      return { data: { count, savedUsers: [] } };
    }
    const result: { data: { totalCount: number, companyData: any } } =
      (await this.getCompanyProspectData({ ...query, userId: savedCompaniesIds.join(',') }, 'list')) as any;
    return {
      data: {
        totalCount: count.length, companyData: result.data.companyData?.map(val => {
          return { ...val, interests: cache[val['id']] }
        })
      }
    };
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
    const endpoint = microserviceEndpoints.company.events.replace(
      ':companyId',
      companyId,
    );
    const backend = process.env.BACKEND;
    if (backend && backend in defaultEventTypes) {
      query['eventTypes'] = Object.values(defaultEventTypes[backend]);
    }
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
        count: data.data.count,
        events: data.data.events,
      };
      return { data: responseToReturn };
    } else {
      const countryData: { data: Country[] } = { data: data.data };
      return {
        data: countryData.data,
      };
    }
  }
  async getCompanyPoc(companyId: string) {
    companyId = decrypt(companyId).replace(
      process.env.TEN_TIMES_ID_ENCRYPT_KEY as string,
      '',
    );
    const baseURL = process.env.MICROSERVICE_URL || '';
    const endpoint = microserviceEndpoints.company.poc.replace(
      ':companyId',
      companyId,
    );
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
        companyPoc: data.data.companyPoCs.map((val) => {
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
  id: string;
  countryCode?: string;
  name: string;
  participation?: any;
  count: number;
  countryZone?: string;
  longitude: string;
  latitude: string;
}
