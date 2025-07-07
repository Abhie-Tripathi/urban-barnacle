import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAccountDto,
  CreateSubscriptionDto,
  GetAccountDto,
  UpdateAccountDto,
  UpdateSubscriptionDto,
  UpdateSubscriptionWebhookDto,
} from './dto';
import { PlanFrequency, Prisma, SubscriptionPlan } from '@prisma/client';
import {
  accountConfig,
  AccountConfigDto,
  MembershipDto,
} from './account.config';
import { membershipMapForToken, TCachedUser } from 'src/utils/types';
import { InputJsonObject, JsonArray } from '@prisma/client/runtime/library';
import { getNameFromEmail } from 'src/utils';
import { createHash, randomInt, randomUUID } from 'crypto';
import { EventsService } from 'src/events/events.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class AccountDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: EventsService,
    private readonly redisService: RedisService,
  ) { }
  async createSubscription(data: CreateSubscriptionDto) {
    const subscription = await this.prisma.subscription.create({
      data: {
        ...data,
      },
    });
    return subscription;
  }
  async updateSubscription(
    data: UpdateSubscriptionDto,
    subscriptionId: string,
  ) {
    const update = await this.prisma.subscription.update({
      where: {
        id: subscriptionId,
      },
      data: {
        ...data,
      },
    });
    return update;
  }
  async createAccount(data: CreateAccountDto) {
    const { interestConfig, ...rest } = data;
    let defaultConfig = accountConfig;
    if (interestConfig) {
      defaultConfig = { ...defaultConfig, interest: interestConfig };
    }
    const account = await this.prisma.account.create({
      data: {
        ...rest,
        accountConfiguration: {
          create: {
            config: defaultConfig as unknown as InputJsonObject,
          },
        },
      },
    });
    return account;
  }

  async getAccounts(data: GetAccountDto) {
    const params = {};
    if (data.id) {
      params['id'] = data.id;
    }
    if (data.userId) {
      params['user'] = {
        some: {
          id: data.userId,
        },
      };
    }
    const accounts = await this.prisma.account.findMany({
      where: {
        ...params,
      },
      select: {
        company: true,
        currentSubscriptionId: true,
        domain: true,
        configurationId: true,
        id: true,
      },
    });
    return accounts;
  }

  async updateAccount(data: UpdateAccountDto) {
    const { configuration, ...rest } = data;
    const config = configuration
      ? {
        accountConfiguration: {
          update: {
            config: configuration,
          },
        },
      }
      : {};
    const account = await this.prisma.account.update({
      where: { id: data.id },
      data: {
        ...rest,
        ...config,
      },
    });
    return account;
  }

  async updateAccountConfiguration(user: TCachedUser, data: AccountConfigDto) {
    const account = await this.prisma.configuration.update({
      where: { id: user.accountConfigurationId },
      data: {
        config: {
          toJSON: () => data,
        },
        lastModifiedById: user.id,
      },
      include: {
        account: true,
      },
    });
    return account;
  }
  async updateAccountMembership(user: TCachedUser, data: MembershipDto) {
    // return await this.prisma.
    const [checkForToken, checkPaymentInfo, checkForDuplicatePaymentId, currentSubscriptionId] = await Promise.all([this.prisma.verification.findFirst({
      where: {
        userId: user.id,
      },
      select: {
        passkey: true,
      },
    }),
    this.getPaymentInfoById(data.subscriptionId),
    this.prisma.$queryRaw<{ count_record: number }[]>(Prisma.raw(`SELECT count(*) count_record FROM "Subscription"
WHERE ("planMetaData"->'paymentData'->>'id') = '${data.subscriptionId || -1}' and deleted=false;
`)), this.prisma.account.findFirst({
      where: {
        id: user.accountId
      }, select: {
        currentSubscriptionId: true
      }
    })]);
    console.log("Number(checkForDuplicatePaymentId[0].count_record)Number(checkForDuplicatePaymentId[0].count_record)", Number(checkForDuplicatePaymentId[0].count_record));

    if (!currentSubscriptionId) {
      throw new HttpException(`subscription not found`, HttpStatus.NOT_FOUND);
    }
    if (checkForDuplicatePaymentId.length && Number(checkForDuplicatePaymentId[0].count_record) >= 1) {
      throw new HttpException(`Invalid subscription`, HttpStatus.NOT_FOUND);
    }
    if (!checkForToken) {
      throw new HttpException(`token not found`, HttpStatus.NOT_FOUND);
    }
    if (data.token !== checkForToken.passkey) {
      throw new HttpException(`Invalid token`, HttpStatus.NOT_FOUND);
    }
    if (data.subscriptionId && !checkPaymentInfo) {
      throw new HttpException(`Invalid subscription`, HttpStatus.NOT_FOUND);
    }
    await this.prisma.verification.update({
      where: {
        userId: user.id,
      },
      data: {
        passkey: '' + Math.random(),
      },
    });

    const [create] = await Promise.all([this.prisma.subscription.create({
      data: {
        accountId: user.accountId,
        plan: data.plan,
        planStartDate: new Date(data.startDate),
        planEndDate: new Date(data.endDate),
        planMetaData: { paymentData: checkPaymentInfo, userData: user },
        currency: data.planPurchaseCurrency,
        purchaseValue: data.planPurchaseValue,
        planFrequency: data.planFrequency,
        planRenewalDate: new Date(data.endDate),
        ...membershipMapForToken[data.plan]
      },
      select: {
        plan: true,
        id: true,
        planStartDate: true,
        planEndDate: true,
        currency: true,
        purchaseValue: true,
        planFrequency: true,
        planRenewalDate: true,
      },
    }), this.prisma.subscription.update({
      where: {
        id: currentSubscriptionId.currentSubscriptionId
      },
      data: {
        deleted: true
      }
    })]);
    if (data.subscriptionId)
      await this.setSubscriptionMetadata(data.subscriptionId, { subscriptionId: create.id, accountId: user.accountId });
    return create;
  }

  async addAccountUser(accountId: string, userId: string) {
    const account = await this.prisma.account.update({
      where: { id: accountId },
      data: { user: { connect: { id: userId } } },
    });
    return account;
  }

  async getAccountConfiguration(configurationId: string) {
    const configuration = await this.prisma.configuration.findUnique({
      where: { id: configurationId },
    });
    if (!configuration) {
      throw new HttpException('configuration not found', HttpStatus.NOT_FOUND);
    }
    return configuration.config;
  }


  async createMembershipToken(user: TCachedUser) {
    const passkey: string = createHash('sha256')
      .update(randomUUID(), 'hex')
      .digest()
      .toString('hex');
    await this.prisma.verification.upsert({
      where: {
        userId: user.id,
      },
      update: {
        passkey: passkey,
        deleted: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
      create: {
        userId: user.id,
        passkey: passkey,
        deleted: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });
    return { token: passkey };
  }
  async getLatestComment(user: TCachedUser) {
    //getNameFromEmail
    const [comment, config] = await Promise.all([
      this.prisma.$queryRaw<
        {
          commentid: string;
          content: string;
          createdAt: Date;
          sourceModule: string;
          enquiryid: string;
          enquirystatus: string;
          username: string | null;
          email: string;
          eventId: string;
        }[]
      >(
        Prisma.raw(`
            SELECT c.id commentid, c.content, c."createdAt", 
            c."sourceModule", e.id enquiryId, e.status enquirystatus, u.firstname|| ' '|| u.lastname username,u.email
           , e."eventId"
            FROM
                "Comment" c
                INNER JOIN "Enquiry" e on c."sourceId" = e.id::text
                and c."sourceModule" = 'OUTREACH'
                INNER join "User" u on c."userId" = u.id and c."accountId"='${user.accountId}'
                ORDER BY c."createdAt" desc
            LIMIT 1;
      `),
      ),
      this.getAccountConfiguration(user.accountConfigurationId),
    ]);
    let eventBasic: any;
    if (comment.length === 1 && comment[0].eventId) {
      const { basic } = await this.eventService.getEvent(
        comment[0].eventId,
        'basic',
      );
      eventBasic = basic;
    }
    // console.log(config, { comment }, comment[0].enquirystatus)
    return comment.length === 1
      ? {
        comment: {
          id: comment[0].commentid,
          content: comment[0].content,
          createdAt: comment[0].createdAt,
          stage: comment[0].sourceModule,
        },
        enquiry: {
          enquiryId: comment[0].enquiryid,
          enquiryStatusLabel: config
            ? config['outreach'].find(
              (val) =>
                val.status.toLowerCase() ===
                comment[0].enquirystatus.toLowerCase(),
            ).label
            : null,
          enquiryStatus: comment[0].enquirystatus,
        },
        event: {
          id: comment[0].eventId,
          name: eventBasic['name'],
        },
        user: {
          name:
            comment[0].username ||
            getNameFromEmail(comment[0].email, null, null),
        },
      }
      : {};
  }
  async getPaymentInfoById(subscriptionId: String | undefined) {
    if (!subscriptionId) {
      return null;
    }
    let url =
      (process.env.PAYMENT_BASE_URL || '') +
      `v1/subscriptions/${subscriptionId}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.PAYMENT_TOKEN}`,
      },
    });
    const data = await response.json();
    if (data['error']) {
      // console.log(JSON.stringify(data));

      throw new HttpException('subscription not found', HttpStatus.BAD_REQUEST);
    }
    if (data?.status && data.status !== 'active') {
      console.warn('subscription status not active:', data);
      throw new HttpException(
        'Wrong subscription status received',
        HttpStatus.BAD_REQUEST,
      );
    }
    // console.log(data);
    return data;
  }
  async setSubscriptionMetadata(stripeSubscriptionId: string, metadata: Record<string, string>) {
    if (!stripeSubscriptionId || typeof metadata !== 'object') {
      throw new HttpException('Invalid subscriptionId or metadata', HttpStatus.BAD_REQUEST);
    }

    const url = `${process.env.PAYMENT_BASE_URL || ''}v1/subscriptions/${stripeSubscriptionId}`;

    const formBody = new URLSearchParams();
    for (const [key, value] of Object.entries(metadata)) {
      formBody.append(`metadata[${key}]`, value);
    }

    const response = await fetch(url, {
      method: 'POST', // PATCH also works
      headers: {
        Authorization: `Bearer ${process.env.PAYMENT_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    });

    const data = await response.json();

    if (data['error']) {
      console.error('Stripe Error:', data);
      throw new HttpException('Failed to update metadata', HttpStatus.BAD_REQUEST);
    }
    console.log(data);

    return data;
  }
  async updateMembershipFromWebhook(body: UpdateSubscriptionWebhookDto) {
    const { subscriptionId, planEndDate, planRenewalDate, planStartDate } = body;
    const checkSubsscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        deleted: false
      }
    });
    if (!checkSubsscription) {
      throw new HttpException(`Invalid subscription`, HttpStatus.NOT_FOUND);
    }
    const where: object = {};
    if (planEndDate) {
      where['planEndDate'] = new Date(planEndDate);
    }
    if (planStartDate) {
      where['planStartDate'] = new Date(planStartDate);
    }
    if (planRenewalDate) {
      where['planRenewalDate'] = new Date(planRenewalDate);
    } else {
      where['planRenewalDate'] = undefined;
    }
    return await this.prisma.subscription.update({
      where: {
        id: subscriptionId,
      },
      data: {
        ...where,
        ...membershipMapForToken[checkSubsscription.plan]
      }
    })
  }
}
