import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto, GetAccountDto, UpdateAccountDto } from './dto';
import { Prisma } from '@prisma/client';
import { accountConfig, AccountConfigDto } from './account.config';
import { TCachedUser } from 'src/utils/types';
import {
  InputJsonObject,
  JsonArray,
  JsonObject,
} from '@prisma/client/runtime/library';

@Injectable()
export class AccountDataService {
  constructor(private readonly prisma: PrismaService) {}

  async createAccount(data: CreateAccountDto) {
    const defaultConfig = accountConfig;
    const account = await this.prisma.account.create({
      data: {
        ...data,
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
}
