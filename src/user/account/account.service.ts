import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AccountDataService } from './account.data.service';
import { TCachedUser } from 'src/utils/types';
import { CompanyDataService } from '../company/company.data.service';
import { CompanyResponseSchema } from '../company/dto';
import { EnquiryService } from 'src/enquiry/enquiry.service';
import { GetEnquiriesDto, GetEnquiriesSchema, GetEnquiryCountDto } from 'src/enquiry/dto';
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
import { AccountConfigKey, GetAccountEnquiriesCountDto, GetBookmarkedEventDto } from './dto';
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
    private readonly eventService: EventsService
  ) { }

  async getAccountCompany(user: TCachedUser) {
    const company = await this.companyDataService.getCompany({
      accountId: user.accountId,
    });
    return CompanyResponseSchema.parse(company);
  }
  async getLatestComment(user: TCachedUser) {
    const comment = await this.accountDataService.getLatestComment(user)
    return comment;
  }
  async getSavedEvent(user: TCachedUser, query: GetBookmarkedEventDto) {
    const savedEventsIds = (
      await this.intentDataService.getUserEventInterest({
        interest: ['BOOKMARK'],
        sourceModule: 'TRACKER',
        // interestedUserId: user.id,
        accountId: user.accountId,
        limit: query.limit,
        offset: query.offset,
      })
    ).map((item) => item.eventId);

    if (savedEventsIds.length === 0) {
      return [];
    }
    const eventParams = {
      eventIds: savedEventsIds,
      limit: query.limit,
      offset: query.offset,
      view: View.tracker,
    } as QueryDto;
    const events = await this.eventService.getAllEvents(eventParams, false);
    return events;
  }
  async getAccountEnquiries(user: TCachedUser, query: GetEnquiriesDto) {
    const { limit, offset, status, type, ...rest } = query;
    const [enquiries, enquiryCount] = await Promise.all([
      this.enquiryService.getEnquiries({
        ...GetEnquiriesSchema.parse({
          accountId: user.accountId,
          userId: user.id,
          status: status?.join(','),
          type: type && typeof type !== 'string' ? type.join(',') : type,
          ...rest,
        }),
        limit,
        offset,
      }),
      this.enquiryService.getEnquiryCount(GetEnquiriesSchema.parse({
        accountId: user.accountId,
        userId: user.id,
        status: status?.join(','),
        type: type && typeof type !== 'string' ? type.join(',') : type,
        ...rest,
      })),
    ]);
    const transformedEnquires = await Promise.all(
      enquiries.map(async (enquiry) => {
        const [interestedCount, activityCount, myActivity] = await Promise.all([
          this.intentDataService.getUserEventInterestCount(GetUserEventInterestCountSchema.parse({
            accountId: user.accountId,
            ...rest,
            enquiryId: enquiry.id,
            groupBy: UserInterestsGroupBy.interests,
            interest: ['ATTEND', 'SPEAK', 'EXHIBIT', 'SPONSOR'],
          })),
          this.intentDataService.getEnquiryActivityCount(GetEnquiryActivityCountSchema.parse({
            accountId: user.accountId,
            activityType: EnquiryActivityType.UPVOTE,
            ...rest,
            enquiryId: enquiry.id,
            groupBy: EnquiryActivityGroupBy.activitySubType,
          })),
          this.intentDataService.getEnquiryActivities(GetEnquiryActivitySchema.parse({
            enquiryId: enquiry.id,
            accountId: user.accountId,
            userId: user.id,
            ...rest,
          })),
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
  async getAccountMemberShipStatus(accountId: string) {
    return await this.accountDataService.getAccountMemberShipStatus(accountId);
  }
  async getAccountConfiguration(user: TCachedUser, key: AccountConfigKey) {
    if (key === 'membership') {
      return await this.getAccountMemberShipStatus(user.accountId);
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
      config['interest'] = interestConfig;
    } else if (key === 'outreach') {
      const outreachConfig = data as OutreachConfigurationDto;
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
  async updateAccountMembership(
    user: TCachedUser,
    data: MembershipDto,
  ) {
    return await this.accountDataService.updateAccountMembership(user, data);
  }
  async createMembershipToken(user: TCachedUser) {
    return this.accountDataService.createMembershipToken(user)
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
