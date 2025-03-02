import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, GetUsersDto, UpdateUserDto } from './dto';
import { TCachedUser } from 'src/utils/types';
import { Prisma, UnlockType, UnlockValue } from '@prisma/client';
import { encrypt, getNameFromEmail } from 'src/utils';
import { microserviceEndpoints } from 'src/utils/endpoints';

@Injectable()
export class UserDataService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: CreateUserDto) {
    const { accountId, primaryCompanyId, ...rest } = data;
    if (!data.accountId && data.currentOnboardingState !== 'PROMOTED_USER') {
      throw new HttpException(
        'account id is must be provided',
        HttpStatus.BAD_REQUEST,
      );
    }
    const account: object = accountId
      ? {
          accounts: {
            connect: {
              id: data.accountId,
            },
          },
        }
      : {};
    const company = primaryCompanyId
      ? {
          company: {
            connect: {
              id: data.primaryCompanyId,
            },
          },
        }
      : {};
    const user = await this.prisma.user.create({
      data: {
        ...rest,
        email: data.email.toLowerCase(),
        ...account,
        ...company,
      },
    });
    return user;
  }

  async getUsers(data: GetUsersDto) {
    const params = {};
    if (data.email && data.email.length > 0) {
      params['email'] = {
        in: data.email.map((email) => email.toLowerCase()),
      };
    }
    if (data.id && data.id.length > 0) {
      params['id'] = {
        in: data.id,
      };
    }
    if (data.accountId) {
      params['accounts'] = {
        some: {
          id: data.accountId,
        },
      };
    }
    if (data.companyId) {
      params['companyId'] = data.companyId;
    }
    const users = await this.prisma.user.findMany({
      where: {
        ...params,
      },
      skip: data.offset,
      take: data.limit,
    });
    return users;
  }

  async updateUser(data: UpdateUserDto) {
    const userData: Record<string, any> = {
      ...data,
    };
    if (data.firstname === '') {
      userData.firstname = null;
    }
    if (data.lastname === '') {
      userData.lastname = null;
    }
    const user = await this.prisma.user.update({
      where: {
        id: data.id,
      },
      data: userData,
    });
    return user;
  }

  async getUserLastActivity(user: TCachedUser, path: string) {
    const lastRequest = await this.prisma.userActivity.findFirst({
      where: {
        userId: user.id,
        path,
        accountId: user.accountId,
        request: {
          path: ['method'],
          string_contains: 'GET',
        },
        createdAt: {
          lt: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return lastRequest;
  }
  async getPocUnlockedDatabyAccount(
    accountId: string,
    targetId: string | undefined,
    source: string,
    pocId: string,
  ) {
    const request = await this.prisma.unlockedTransaction.findMany({
      where: {
        accountId: accountId,
        targetId: targetId, // eventId /companyId
        source: source, // page
        sourceId: pocId, // userid
      },
    });
    return request;
  }
  async craetePocunlockedTransaction(
    user: TCachedUser,
    targetId: string | undefined,
    source: string,
    pocId: string,
    unlockValue: UnlockValue,
    target: UnlockType,
  ) {
    const request = await this.prisma.unlockedTransaction.create({
      data: {
        accountId: user.accountId,
        targetId: targetId,
        source: source,
        target: target,
        sourceId: pocId,
        unlockedById: user.id,
        unlockValue: unlockValue,
      },
    });
    return request;
  }
  async updatePocUnlockedTransaction(unlockedId: string) {
    await this.prisma.unlockedTransaction.update({
      where: {
        id: unlockedId,
      },
      data: {
        updatedAt: new Date(),
      },
    });
    return { data: { message: 'updated' } };
  }
  async getPocsunlocked(pocId: string, params: UnlockValue[]) {
    const url =
      process.env.MICROSERVICE_URL +
      microserviceEndpoints.events.eventPocsUnlocked +
      '?' +
      `unlockValue=${params.join(',').toLowerCase()}&pocId=${pocId}`;
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (!data || error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return {
      ...data,
      id: encrypt(data.id + process.env.TEN_TIMES_ID_ENCRYPT_KEY),
    };
  }
}
