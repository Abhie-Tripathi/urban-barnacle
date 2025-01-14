import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto, GetAccountDto, UpdateAccountDto } from './dto';

@Injectable()
export class AccountDataService {
  constructor(private readonly prisma: PrismaService) {}

  async createAccount(data: CreateAccountDto) {
    const account = await this.prisma.account.create({
      data,
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
}
