import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AccountDataService } from './account.data.service';
import { TCachedUser } from 'src/utils/types';
import { CompanyDataService } from '../company/company.data.service';
import { CompanyResponseSchema } from '../company/dto';
import { EnquiryService } from 'src/enquiry/enquiry.service';
import {
  GetEnquiriesDto,
  GetEnquiriesHttpDto,
  GetEnquiriesSchema,
  GetEnquiryCountDto,
} from 'src/enquiry/dto';
import { GetUserHttpDto } from '../dto';
import { UserService } from '../user.service';
import { UserDataService } from '../user.data.service';
import {
  Enquiry,
  EnquiryActivityType,
  EnquiryStatus,
  Prisma,
} from '@prisma/client';
import {
  AccountConfigDto,
  FilterConfigurationDto,
  InterestConfigurationDto,
  MembershipDto,
  OutreachConfigurationDto,
} from './account.config';
import { UserDataSchema } from '../me/dto';
import {
  AccountConfigKey,
  GetAccountEnquiriesCountDto,
  GetBookmarkedEventDto,
} from './dto';
import { IntentDataService } from 'src/intent/intent.data.service';
import {
  GetUserEventInterestCountDto,
  GetUserEventInterestCountSchema,
  UserInterestsGroupBy,
} from 'src/intent/dto';
import {
  EnquiryActivityGroupBy,
  GetEnquiryActivityCountDto,
  GetEnquiryActivityCountSchema,
  GetEnquiryActivitySchema,
} from 'src/intent/dto/enquiryActivity.dto';
import { EnquiryResponseSchema } from 'src/enquiry/dto/response';
import { getNameFromEmail } from 'src/utils';
import { QueryDto, View } from 'src/events/dto';
import { EventsService } from 'src/events/events.service';
import { SharedService } from 'src/shared/shared.service';
import { PromotedEventsService } from 'src/promotedEvent/promoted-event.service';

@Injectable()
export class AccountService {
  constructor(
    private readonly accountDataService: AccountDataService,
    private readonly companyDataService: CompanyDataService,
    private readonly enquiryService: EnquiryService,
    private readonly userDataService: UserDataService,
    private readonly intentDataService: IntentDataService,
    private readonly eventService: EventsService,
    private readonly sharedService: SharedService,
    private readonly promoteEventService: PromotedEventsService,
  ) { }

  async getAccountCompany(user: TCachedUser) {
    const company = await this.companyDataService.getCompany({
      accountId: user.accountId,
    });
    return CompanyResponseSchema.parse(company);
  }
  async getLatestComment(user: TCachedUser) {
    const comment = await this.accountDataService.getLatestComment(user);
    return comment;
  }
  async getSavedEvent(
    user: TCachedUser,
    query: GetBookmarkedEventDto,
    showValues: string,
  ) {
    const [savedEvents, count] = await Promise.all([
      this.intentDataService.getUserEventInterest({
        interest: ['BOOKMARK'],
        sourceModule: { in: ['TRACKER', 'RESEARCH'] },
        // interestedUserId: user.id,
        accountId: user.accountId,
        limit: query.limit,
        offset: query.offset,
      }),
      this.intentDataService.getUserEventInterestCountForBookmark({
        interest: ['BOOKMARK'],
        sourceModule: { in: ['TRACKER', 'RESEARCH'] },
        // interestedUserId: user.id,
        accountId: user.accountId,
        limit: query.limit,
        offset: query.offset,
      }),
    ]);
    const savedEventsIds = savedEvents.map((item) => item.eventId);
    if (savedEventsIds.length === 0) {
      return [];
    }
    const eventParams = {
      eventIds: savedEventsIds,
      limit: query.limit,
      // offset: 0,
      showValues: showValues,
      view: View.tracker,
    } as QueryDto;
    const events = await this.eventService.getAllEvents(eventParams, false);
    return { ...events, count: count.length };
  }
  async getEventFromProductDb(
    user: TCachedUser,
    eventIds: string[],
    name: string | undefined,
    event_active_gte: string | undefined,
    event_active_lte: string | undefined,
    limit: number | undefined,
    offset: number | undefined,
    showValues: string,
    enquiries: Enquiry[],
  ) {
    const events = (await this.promoteEventService.getEvent(user, {
      limit: eventIds.length,
      offset: 0,
      source: 'COORDINATE',
      ...(name ? { name: name } : {}),
      ...(event_active_lte && event_active_gte
        ? { start_date: event_active_gte, end_date: event_active_lte }
        : event_active_lte
          ? { expired: new Date().toISOString() }
          : event_active_gte
            ? { upcoming: 'true' }
            : {}),
      eventIds,
    })) as unknown as { data: { totalCount: number; data: any[] } };
    const enquiryDataMappedToeventId: object = {};
    enquiries.map((val) => {
      enquiryDataMappedToeventId[val.eventId] = val;
    });
    const selectedEnquiries = eventIds
      .map((eventId, index) => {
        // const selectedEnquiries = events.events.map((event) => {
        const event = events.data.data.find((event) => event.id === eventId);
        const enquiry = enquiryDataMappedToeventId[eventId];
        if (!event || !enquiry) {
          return null;
        }
        return {
          ...enquiry,
          eventData: {
            id: eventId,
            name: event['name'],
            primaryEventType: event.data['event_type']?.toLowerCase() || null,
            format: event.data['format']?.toLowerCase() || null,
            description: event.data['description'] || null,
            startDateTime: event.data['start_date'] || null,
            endDateTime: event.data['end_date'] || null,
            logoUrl: event.data['logoUrl'] || null,
            rating: null,
            organizer: null,
            eventLocation: {
              id: event.data['venue_id'] || event.data['location_city_id'],
              name: event.data['venue_name'] || event.data['location_city'],
              locationType: event.data['venue_id'] ? 'VENUE' : 'CITY',
              latitude: event.data['venue_latitude'] || event.data['latitude'],
              longitude:
                event.data['venue_longitude'] || event.data['longitude'],
              ...(event.data['location_city_id']
                ? {
                  cityId: event.data['location_city_id'],
                  cityName: event.data['location_city'],
                }
                : {}),
              countryIso: event.data['location_country_iso_code'],
              stateId: event.data['location_state_id'],
              stateName: event.data['location_state'],
              countryId: event.data['location_country_id'],
              countryName: event.data['location_country'],
              displayName: `${event.data['venue_name'] ? event.data['venue_name'] + ',' : ''}${event.data['location_city'] ? event.data['location_city'] + ',' : ''}${event.data['location_country'] ? event.data['location_country'] : ''}`,
            },
          },
          isProductEvent: true,
        };
      })
      .filter((item) => item !== null);
    return selectedEnquiries;
  }
  async getEventFromMicroService(
    eventIds: string[],
    name: string | undefined,
    event_active_gte: string | undefined,
    event_active_lte: string | undefined,
    limit: number | undefined,
    offset: number | undefined,
    showValues: string,
    enquiries: Enquiry[],
  ) {
    const events = (await this.eventService.getAllEvents({
      eventIds: eventIds,
      view: View.list,
      query: name,
      active_gte: event_active_gte,
      active_lte: event_active_lte,
      limit: limit,
      offset: offset,
      showValues: showValues,
    })) as any;
    const enquiryDataMappedToeventId: object = {};
    enquiries.map((val) => {
      enquiryDataMappedToeventId[val.eventId] = val;
    });
    const selectedEnquiries = eventIds
      .map((eventId, index) => {
        // const selectedEnquiries = events.events.map((event) => {
        const event = events.events.find((event) => event.basic.id === eventId);
        const enquiry = enquiryDataMappedToeventId[eventId];
        if (!event || !enquiry) {
          return null;
        }
        return {
          ...enquiry,
          eventData: {
            ...event.basic,
          },
          isProductEvent: false,
        };
      })
      .filter((item) => item !== null);
    return selectedEnquiries;
  }
  async getAccountEnquiries(
    user: TCachedUser,
    query: GetEnquiriesHttpDto,
    showValues: string,
  ) {
    const {
      limit,
      offset,
      status,
      type,
      event_active_gte,
      event_active_lte,
      groupBy,
      initiatedBy,
      name,
      upvotedBy,
      eventId,
    } = query;
    const [enquiries, enquiryEvents] = await Promise.all([
      this.enquiryService.getEnquiries({
        accountId: user.accountId,
        userId: user.id,
        initiatedBy: initiatedBy,
        upvotedBy: upvotedBy,
        status: status,
        type: type,
        ...(eventId ? { eventId: eventId } : {}),
      }),
      await this.enquiryService.getEnquiries({
        accountId: user.accountId,
        userId: user.id,
        initiatedBy: initiatedBy,
        upvotedBy: upvotedBy,
        status: status,
        type: type,
        limit,
        offset,
        ...(eventId ? { eventId: eventId } : {}),
      }),
    ]);
    console.log('start=>1');
    if (enquiries.length === 0) {
      return {
        count: 0,
        enquiries: [],
      };
    }
    console.log('start=>2');
    let eventIds = enquiries.map((enquiry) => enquiry.eventId);
    // const enquiryCount = eventIds.length;
    const selectedEventIds: string[] = enquiryEvents.map(
      (enquiry) => enquiry.eventId,
    );
    if (!event_active_gte || !event_active_lte || !name) {
      eventIds = selectedEventIds;
    }
    const [productEvents, microServiceEvents] = await Promise.all([
      this.getEventFromProductDb(
        user,
        eventIds,
        name,
        event_active_gte,
        event_active_lte,
        limit,
        0,
        showValues,
        enquiries,
      ),
      this.getEventFromMicroService(
        eventIds,
        name,
        event_active_gte,
        event_active_lte,
        limit,
        0,
        showValues,
        enquiries,
      ),
    ]);
    const combinedEvents = [...productEvents, ...microServiceEvents];
    // event_active_gte || event_active_lte
    //   ? this.filterEvents([...productEvents, ...microServiceEvents], {
    //     event_active_gte,
    //     event_active_lte,
    //   })
    //   :
    const enquiryCount = combinedEvents.length;
    const eventMap = new Map<string, any>();
    combinedEvents.forEach((event) => {
      eventMap.set(event.eventId, event);
    });

    const selectedEnquiries = eventIds
      .map((id) => eventMap.get(id))
      .filter((event) => event !== undefined && event !== null);
    // return selectedEnquiries;
    // const [enquiries, enquiryCount] = await Promise.all([
    //   this.enquiryService.getEnquiries({
    //     ...GetEnquiriesSchema.parse({
    //       accountId: user.accountId,
    //       userId: user.id,
    //       status: status?.join(','),
    //       type: type && typeof type !== 'string' ? type.join(',') : type,
    //       ...rest,
    //     }),
    //     limit,
    //     offset,
    //   }),
    //   this.enquiryService.getEnquiryCount(
    //     GetEnquiriesSchema.parse({
    //       accountId: user.accountId,
    //       userId: user.id,
    //       status: status?.join(','),
    //       type: type && typeof type !== 'string' ? type.join(',') : type,
    //       ...rest,
    //     }),
    //   ),
    // ]);
    console.log(
      'selectedEventIds=>',
      { productEvents },
      { selectedEventIds },
      { eventMap },
      { microServiceEvents },
      { selectedEnquiries }
    );
    const transformedEnquires = await Promise.all(
      selectedEnquiries.map(async (enquiry) => {
        const [interestedCount, activityCount, myActivity] = await Promise.all([
          this.intentDataService.getUserEventInterestCount(
            GetUserEventInterestCountSchema.parse({
              accountId: user.accountId,
              enquiryId: enquiry.id,
              groupBy: UserInterestsGroupBy.interests,
              interest: ['ATTEND', 'SPEAK', 'EXHIBIT', 'SPONSOR'],
            }),
          ),
          this.intentDataService.getEnquiryActivityCount(
            GetEnquiryActivityCountSchema.parse({
              accountId: user.accountId,
              activityType: EnquiryActivityType.UPVOTE,
              enquiryId: enquiry.id,
              groupBy: EnquiryActivityGroupBy.activitySubType,
            }),
          ),
          this.intentDataService.getEnquiryActivities(
            GetEnquiryActivitySchema.parse({
              enquiryId: enquiry.id,
              accountId: user.accountId,
              userId: user.id,
            }),
          ),
        ]);
        const owner = enquiry.owner
          ? {
            id: enquiry.owner.id,
            name: getNameFromEmail(
              enquiry.owner.email,
              enquiry.owner.firstname,
              enquiry.owner.lastname,
            ),
            email: enquiry.owner.email,
            imageUrl: enquiry.owner.imageUrl,
          }
          : null;
        const interestCounts = {
          total: 0,
          attend: 0,
          speak: 0,
          sponsor: 0,
          exhibit: 0,
        };
        interestedCount.forEach((curr) => {
          interestCounts.total += curr._count.id;
          interestCounts[curr.interest.toLowerCase()] = curr._count.id;
        });

        const activityCounts = {
          total: 0,
          attend: 0,
          speak: 0,
          sponsor: 0,
          exhibit: 0,
        };
        activityCount.forEach((curr) => {
          activityCounts.total += curr._count.id;
          activityCounts[curr.activitySubType.toLowerCase()] = curr._count.id;
        });
        console.log(
          'selectedEventIds=>',
          { selectedEventIds },
          { eventMap },
          { microServiceEvents },
          { selectedEnquiries },
        );
        return EnquiryResponseSchema.parse({
          ...enquiry,
          activityCount: activityCounts,
          interestedCount: interestCounts,
          myActivity: myActivity,
          owner,
        });
      }),
    );
    return {
      count: enquiryCount,
      enquiries: transformedEnquires,
    };
  }
  filterEvents(
    events: any[],
    filters: {
      event_active_gte?: string;
      event_active_lte?: string;
      sortBy?: 'startDate' | 'endDate';
      sortOrder?: 'asc' | 'desc';
    },
  ): any[] {
    const {
      event_active_gte,
      event_active_lte,
      sortBy = 'startDate',
      sortOrder = 'desc',
    } = filters;

    const gte = event_active_gte ? new Date(event_active_gte) : null;
    const lte = event_active_lte ? new Date(event_active_lte) : null;

    let filtered = events.filter((event) => {
      const start = new Date(event.eventData.startDate);
      const end = new Date(event.eventData.endDate);

      if (lte && !gte) {
        // Case 1: Only lte (past events)
        return end <= lte;
      }

      if (gte && !lte) {
        // Case 2: Only gte (upcoming events)
        return start >= gte || (start <= gte && end >= gte);
      }

      if (gte && lte) {
        // Case 3: Range overlap
        return end >= gte && start <= lte;
      }

      return true; // No filters
    });

    // filtered.sort((a, b) => {
    //   const dateA = new Date(a.eventData[sortBy]);
    //   const dateB = new Date(b.eventData[sortBy]);

    //   return sortOrder === 'asc'
    //     ? dateA.getTime() - dateB.getTime()
    //     : dateB.getTime() - dateA.getTime();
    // });

    return filtered;
  }

  async getAccountUsers(user: TCachedUser, query: GetUserHttpDto) {
    const users = await this.userDataService.getUsers({
      accountId: user.accountId,
      ...query,
    });
    return users.map((user) => ({
      id: user.id,
      name:
        user.firstname || user.lastname
          ? `${user.firstname} ${user.lastname || ''}`
          : user.email.split('@')[0],
      email: user.email,
      imageUrl: user.imageUrl,
      designation: user.designation,
      department: user.department,
    }));
  }
  async getAccountMemberShipStatus(currentSubscriptionId: string) {
    return await this.sharedService.getAccountMemberShipStatus(
      currentSubscriptionId,
    );
  }
  async getAccountConfiguration(user: TCachedUser, key: AccountConfigKey) {
    if (key === 'membership') {
      return await this.getAccountMemberShipStatus(user.currentSubscriptionId);
    }
    const configuration = await this.accountDataService.getAccountConfiguration(
      user.accountConfigurationId,
    );
    return { [key]: configuration ? configuration[key] : [] };
  }

  async updateAccountConfiguration(
    user: TCachedUser,
    key: AccountConfigKey,
    data:
      | InterestConfigurationDto
      | OutreachConfigurationDto
      | FilterConfigurationDto,
  ) {
    const config = await this.accountDataService.getAccountConfiguration(
      user.accountConfigurationId,
    );
    if (!config) {
      return [];
    }
    if (key === 'interest') {
      const interestConfig = data as InterestConfigurationDto;
      if (interestConfig.length > 4) {
        throw new HttpException(
          'Interest configuration cannot be more than 4',
          HttpStatus.BAD_REQUEST,
        );
      }
      const uniqueStatus = new Set();
      interestConfig.forEach((item) => {
        if (uniqueStatus.has(item.status)) {
          throw new HttpException(
            'Status must not be repeated',
            HttpStatus.BAD_REQUEST,
          );
        }
        uniqueStatus.add(item.status);
      });
      config['interest'] = interestConfig;
    } else if (key === 'outreach') {
      const outreachConfig = data as OutreachConfigurationDto;
      if (outreachConfig.length > 7) {
        throw new HttpException(
          'Outreach configuration cannot be more than 7',
          HttpStatus.BAD_REQUEST,
        );
      }
      const uniqueStatus = new Set();
      outreachConfig.forEach((item) => {
        if (uniqueStatus.has(item.status)) {
          throw new HttpException(
            'Status must not be repeated',
            HttpStatus.BAD_REQUEST,
          );
        }
        uniqueStatus.add(item.status);
      });
      config['outreach'] = outreachConfig;
    } else if (key === 'filter') {
      const filterConfig = data as FilterConfigurationDto;
      config['filter'] = filterConfig;
    }
    const configuration = (
      await this.accountDataService.updateAccountConfiguration(
        user,
        config as unknown as AccountConfigDto,
      )
    ).config;

    return { [key]: configuration ? configuration[key] : [] };
  }
  async updateAccountMembership(user: TCachedUser, data: MembershipDto) {
    return await this.accountDataService.updateAccountMembership(user, data);
  }
  async createMembershipToken(user: TCachedUser) {
    return this.accountDataService.createMembershipToken(user);
  }
  async getAccountEnquiriesCount(
    user: TCachedUser,
    query: GetAccountEnquiriesCountDto,
  ) {
    let params: Record<string, any> = {
      accountId: user.accountId,
    };
    if (query.type) {
      params.groupBy = query.type;
      if (query.type === UserInterestsGroupBy.interests) {
        const interestParams: GetUserEventInterestCountDto = {
          ...params,
          interest: ['ATTEND', 'SPEAK', 'EXHIBIT', 'SPONSOR'],
        };
        params = interestParams;
      } else if (query.type === UserInterestsGroupBy.status) {
        const statusParams: GetEnquiryCountDto = {
          ...params,
        };
        params = statusParams;
      }
    }
    params.groupBy = query.type;
    if (query.type === UserInterestsGroupBy.interests) {
      params.interest = ['ATTEND', 'SPEAK', 'EXHIBIT', 'SPONSOR'];
    }

    const [interests, totalEnquiries, enquiryCount] = await Promise.all([
      this.intentDataService.getUserEventInterestCount(params),
      this.enquiryService.getEnquiryCount({
        accountId: user.accountId,
      }),
      params.groupBy === UserInterestsGroupBy.status
        ? this.enquiryService.getEnquiryCount({
          accountId: user.accountId,
          groupBy: params.groupBy,
        })
        : null,
    ]);
    let response = {};

    switch (query.type) {
      case UserInterestsGroupBy.interests:
        const defaultCount = {
          totalInterests: 0,
          attend: 0,
          speak: 0,
          sponsor: 0,
          exhibit: 0,
        };
        const groupedInterestsByInterestType = interests.reduce((acc, curr) => {
          defaultCount.totalInterests += curr._count.id;
          acc[curr.interest.toLowerCase()] = curr._count.id;
          return acc;
        }, defaultCount);
        response = {
          ...groupedInterestsByInterestType,
          totalInterests: defaultCount.totalInterests,
        };
        break;
      case UserInterestsGroupBy.status:
        const defaultStatusCount = {
          cancelled: 0,
          confirmed: 0,
          pending: 0,
          shortlisted: 0,
          in_discussion: 0,
          in_negotiation: 0,
          rejected: 0,
        };
        const groupedInterestsByStatus = enquiryCount
          ? (
            enquiryCount as Array<{ status: string; _count: { id: number } }>
          ).reduce((acc, curr) => {
            acc[curr.status.toLowerCase()] = curr._count.id;
            return acc;
          }, defaultStatusCount)
          : null;
        response = {
          ...groupedInterestsByStatus,
        };
        break;
    }

    return {
      totalEnquiries: totalEnquiries,
      ...response,
    };
  }
}
