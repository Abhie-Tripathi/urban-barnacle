import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, GetUsersDto, UpdateUserDto } from './dto';
import { TCachedUser } from 'src/utils/types';

@Injectable()
export class UserDataService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: CreateUserDto) {
    const { accountId, companyId, ...rest } = data;
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
    const company = companyId
      ? {
          company: {
            connect: {
              id: data.companyId,
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
    console.log(params);
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
    const user = await this.prisma.user.update({
      where: {
        id: data.id,
      },
      data,
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
}
