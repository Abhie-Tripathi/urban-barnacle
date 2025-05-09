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
import { EnquiryActivityType, EnquiryStatus, Prisma } from '@prisma/client';
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

@Injectable()
export class AccountService {
  constructor(
    private readonly accountDataService: AccountDataService,
    private readonly companyDataService: CompanyDataService,
    private readonly enquiryService: EnquiryService,
    private readonly userDataService: UserDataService,
    private readonly intentDataService: IntentDataService,
    private readonly eventService: EventsService,
  ) {}

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
    const enquiries = await this.enquiryService.getEnquiries({
      accountId: user.accountId,
      userId: user.id,
      initiatedBy: initiatedBy,
      upvotedBy: upvotedBy,
      status: status,
      type: type,
      ...(eventId ? { eventId: eventId } : {}),
    });
    if (enquiries.length === 0) {
      return {
        count: 0,
        enquiries: [],
      };
    }
    const eventIds = enquiries.map((enquiry) => enquiry.eventId);
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
    const enquiryCount = events.count;
    const selectedEnquiries = eventIds
      .map((eventId, index) => {
        // const selectedEnquiries = events.events.map((event) => {
        const event = events.events.find((event) => event.basic.id === eventId);
        const enquiry = enquiries[index];
        if (!event || !enquiry) {
          return null;
        }
        const location = event.basic.eventLocation;
        return {
          ...enquiry,
          eventData: {
            eventId: event.basic.id,
            name: event.basic.name,
            startDate: event.basic.startDateTime,
            endDate: event.basic.endDateTime,
            logoUrl: event.basic.logoUrl!,
            website: event.basic.website!,
            organizerName: event.basic.organizer?.name,
            location: {
              cityName:
                location.locationType === 'VENUE'
                  ? location.cityName
                  : location.locationType === 'CITY'
                    ? location.name
                    : null,
              stateName: ['VENUE', 'CITY'].includes(location.locationType)
                ? location.stateName
                : location.locationType === 'STATE'
                  ? location.name
                  : null,
              countryName: ['VENUE', 'CITY', 'STATE'].includes(
                location.locationType,
              )
                ? location.countryName
                : location.locationType === 'COUNTRY'
                  ? location.name
                  : null,
            },
          },
        };
      })
      .filter((item) => item !== null);
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
    console.log(selectedEnquiries);
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
    return await this.accountDataService.getAccountMemberShipStatus(
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
