import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto, GetAccountDto, UpdateAccountDto } from './dto';
import { Prisma } from '@prisma/client';
import { accountConfig, AccountConfigDto } from './account.config';
import { TCachedUser } from 'src/utils/types';

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
            config: Object.entries(defaultConfig),
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
    const account = await this.prisma.account.update({
      where: { id: data.id },
      data,
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

  async getAccountConfiguration(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { accountConfiguration: true },
    });
    if (!account) {
      throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
    }
    return account.accountConfiguration.config;
  }
}
