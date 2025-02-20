import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto, GetAccountDto, UpdateAccountDto } from './dto';
import { Prisma } from '@prisma/client';
import { accountConfig, AccountConfigDto } from './account.config';
import { TCachedUser } from 'src/utils/types';
import { InputJsonObject, JsonArray } from '@prisma/client/runtime/library';
import { getNameFromEmail } from 'src/utils';

@Injectable()
export class AccountDataService {
  constructor(private readonly prisma: PrismaService) { }

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
      include: {
        company: true,
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

  async getLatestComment(user: TCachedUser) {
    //getNameFromEmail
    const [comment, config] = await Promise.all([this.prisma.$queryRaw<{
      commentid: string;
      content: string;
      createdAt: Date;
      sourceModule: string;
      enquiryId: string;
      enquirystatus: string;
      username: string | null;
      email: string;
      eventname: string;
      eventId: string;
    }[]>(Prisma.raw(`
            SELECT c.id commentid, c.content, c."createdAt", 
            c."sourceModule", e.id enquiryId, e.status enquirystatus, u.firstname|| ' '|| u.lastname username,u.email
            , e."eventData" ->> 'name' eventname, e."eventId"
            FROM
                "Comment" c
                INNER JOIN "Enquiry" e on c."sourceId" = e.id::text
                and c."sourceModule" = 'OUTREACH'
                INNER join "User" u on c."userId" = u.id and c."accountId"='${user.accountId}'
                ORDER BY c."createdAt" desc
            LIMIT 1;
      `)), this.getAccountConfiguration(user.accountConfigurationId)]);
    console.log(config, { comment }, comment[0].enquirystatus)
    return {
      "comment": {
        "id": comment[0].commentid,
        "content": comment[0].content,
        "createdAt": comment[0].createdAt,
        "stage": comment[0].sourceModule,
      },
      "enquiry": {
        "enquiryId": comment[0].enquiryId,
        "enquiryStatusLabel": config ? config['outreach'].find(val => val.status.toLowerCase() === comment[0].enquirystatus.toLowerCase()).label : null,
        "enquiryStatus": comment[0].enquirystatus,
      },
      "event": {
        "id": comment[0].eventId,
        "name": comment[0].eventname,
      },
      "user": {
        "name": comment[0].username || getNameFromEmail(comment[0].email, null, null),
      }
    };
  }
}
