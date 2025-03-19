import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InterestStatus, Prisma } from '@prisma/client';
import { UserDataService } from 'src/user/user.data.service';
import { CommunicationService } from 'src/communication/communication.service';
import { QueueActionOptions } from 'src/utils/types';
import {
  IntendCaptureDataSchema,
  IntendUpdateDataSchema,
} from 'src/communication/bull.dto';
import { AccountDataService } from 'src/user/account/account.data.service';

@Injectable()
export class IntendDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userDataservice: UserDataService,
    private readonly communcationService: CommunicationService,
    private readonly accountDataService: AccountDataService,
  ) { }
  async checkUserAndEventExist(userEmail: string, eventId: string) {
    const [usercheck, event] = await Promise.all([
      this.prisma.user.findUnique({
        where: {
          email: userEmail,
        },
        select: {
          id: true,
          currentOnboardingState: true,
          accounts: {
            select: {
              id: true,
            },
          },
        },
      }),
      this.prisma.event.findFirst({
        where: {
          id: eventId,
        },
        select: {
          id: true,
          name: true,
          data: true,
          capacity: true,
          approval: true,
          waitlisting: true,
          User: {
            select: {
              accounts: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      }),
    ]);
    return { usercheck, event };
  }
  async updateEvent(data: any, eventId: string) {
    const update = await this.prisma.event.update({
      where: {
        id: eventId,
      },
      data: {
        ...data,
      },
    });
    return update;
  }
  async createUser(data: any) {
    const createSubscription = await this.accountDataService.createSubscription({ planEndDate: new Date('2026-01-01') });
    const account = await this.accountDataService.createAccount({ currentSubscriptionId: createSubscription.id });
    const updateSubscription = await this.accountDataService.updateSubscription({ accountId: account.id }, createSubscription.id);
    return {
      ...(await this.userDataservice.createUser({
        ...data,
        currentOnboardingState: 'PROMOTED_USER',
        accountId: account.id,
        source: data.source
      })),
      primaryAccountId: account.id,
      accountId: account.id,
    };
  }
  async updateUser(data: any) {
    return await this.userDataservice.updateUser({
      ...data,
    });
  }

  async findManyUser(userIds: string[], sortByOptions: any) {
    const userDetails = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
      },
      ...sortByOptions,
    });
    return userDetails;
  }
  async findIntendData(
    where: any,
    whereSql: any,
    limit: number,
    offset: number,
    sortType: string,
    eventId: string,
  ) {
    const [count, userInterest, stats] = await Promise.all([
      this.prisma.userEventInterest.findMany({
        where: {
          sourceModule: 'PROMOTED_EVENT',
          ...where,
        },
        // distinct: ['userId'],
        select: {
          interestedUserId: true,
        },
      }),
      this.prisma.userEventInterest.findMany({
        where: {
          sourceModule: 'PROMOTED_EVENT',
          ...where,
        },
        // distinct: ['userId'],
        select: {
          interestedUserId: true,
          createdAt: true,
          id: true,
          status: true,
        },
        orderBy: { createdAt: sortType as any },
        take: limit,
        skip: offset,
      }),
      this.prisma.$queryRaw<{ status: string; count: number }[]>(
        Prisma.raw(`
         select status, count(DISTINCT id) count
          from "UserEventInterest"
          where
           "sourceModule" = 'PROMOTED_EVENT'
          and ${whereSql.join(' AND ')}
              group by
              status      
        `),
      ),
    ]);
    return { count, userInterest, stats };
  }
  async updateEventInterest(
    data: any,
    status: InterestStatus,
    eventInterestId: string,
  ) {
    const updateInterest = await this.prisma.userEventInterest.update({
      where: {
        id: eventInterestId,
      },
      data: {
        status: status,
        ...data,
      },
      select: {
        id: true,
        status: true,
        sourceId: true,
        eventId: true,
        interest: true,
        interestedUser: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            imageUrl: true
          },
        },
      },
    });
    return updateInterest;
  }
  async checkEventInterestExist(where: any) {
    const check = await this.prisma.userEventInterest.findFirst({
      where: { ...where },
      select: {
        id: true,
        status: true,
      },
    });
    return check;
  }
  async createUserEventInterest(data: any) {
    const create = await this.prisma.userEventInterest.create({
      data: {
        ...data,
      },
    });
    return create;
  }
  async createjob(
    eventId: string,
    userId: string,
    someData: object,
    flag: boolean,
  ) {
    const [eventData, userShowedInterestData] = await Promise.all([
      this.prisma.event.findUnique({
        where: {
          id: eventId,
        },
        select: {
          id: true,
          name: true,
          data: true,
          User: {
            select: {
              id: true,
              email: true,
              firstname: true,
              lastname: true,
              accounts: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        },
      }),
    ]);
    const getCountForInterest = await this.prisma.$queryRaw<
      {
        status: InterestStatus;
        count: number;
      }[]
    >(
      Prisma.raw(`
        select status, count(*) count
          from "UserEventInterest"
          where
              "accountId" in ('${eventData?.User?.accounts[0]?.id}')
              and "eventId" = '${eventId}'
              and "sourceModule" = 'PROMOTED_EVENT'
              group by
              status
      `),
    );
    let pendingCount,
      confirmedCount,
      waitListCount,
      inviteCount: number = 0;
    for (const interest of getCountForInterest) {
      if (interest.status === 'CONFIRMED') {
        confirmedCount = interest.count;
      } else if (interest.status === 'PENDING') {
        pendingCount = interest.count;
      } else if (interest.status === 'WAITLISTING') {
        waitListCount = interest.count;
      } else if (interest.status === 'INVITATION') {
        inviteCount = interest.count;
      }
    }
    const payloadForjob: object = {
      ...someData,
      userShowedInterestName:
        userShowedInterestData?.firstname +
        ' ' +
        (userShowedInterestData?.lastname ?? ''),
      userShowedInterestEmail: userShowedInterestData?.email,
      eventOwnerEmail: eventData?.User.email,
      eventOwnerName:
        eventData?.User.firstname + ' ' + (eventData?.User.lastname ?? ''),
      eventName: eventData?.name,
      pending: String(pendingCount ?? 0),
      going: String(confirmedCount ?? 0),
      waitlist: String(waitListCount ?? 0),
      inviteCount: String(inviteCount ?? 0),
      eventStartDate: (eventData?.data as any)['start_date'],
      eventEndDate: (eventData?.data as any)['end_date'],
      eventLocation:
        (eventData?.data?.['location_city'].length > 1
          ? eventData?.data?.['location_city'] + ', '
          : '') + (eventData as any).data['location_country'],
    };
    await this.communcationService.createJobForBull(
      flag
        ? QueueActionOptions.SEND_EVENT_INTEND_CAPTURE_EMAIL
        : QueueActionOptions.SEND_EVENT_INTEND_UPDATE_EMAIL,
      flag
        ? IntendCaptureDataSchema.parse(payloadForjob)
        : IntendUpdateDataSchema.parse(payloadForjob),
      flag ? (eventData?.User.id ?? '') : (userShowedInterestData?.id ?? ''),
    );
  }
}
