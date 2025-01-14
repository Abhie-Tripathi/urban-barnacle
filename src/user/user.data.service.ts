import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, GetUsersDto, UpdateUserDto } from './dto';

@Injectable()
export class UserDataService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: CreateUserDto) {
    if (!data.accountId && data.currentOnboardingState !== 'PROMOTED_USER') {
      throw new HttpException(
        'account id is must be provided',
        HttpStatus.BAD_REQUEST,
      );
    }
    const account: object = data.accountId
      ? {
          accounts: {
            connect: {
              id: data.accountId,
            },
          },
        }
      : {};
    const user = await this.prisma.user.create({
      data: {
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email.toLowerCase(),
        role: data.role,
        imageUrl: data.imageUrl,
        companyId: data.companyId,
        industry: data.industry,
        subIndustry: data.subIndustry,
        category: data.category,
        currentOnboardingState: data.currentOnboardingState,
        ...account,
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
      skip: parseInt(data.offset),
      take: parseInt(data.limit),
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
}
