import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, GetUsersDto, UpdateUserDto } from './dto';
import { TCachedUser } from 'src/utils/types';
import { Prisma, UnlockType, UnlockValue } from '@prisma/client';
import { encrypt, getNameFromEmail } from 'src/utils';
import { microserviceEndpoints } from 'src/utils/endpoints';
import { File } from '@nest-lab/fastify-multer';
import { FileCreationService } from 'src/shared/file-creation.service';

@Injectable()
export class UserDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FileCreationService,
  ) { }

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

  async updateUser(
    data: UpdateUserDto,
    file?: File,
    removePicture: boolean = false,
  ) {
    const userData: Record<string, any> = {
      ...data,
    };
    if (file && file.buffer) {
      const { fileData } = await this.fileService.createFile(
        '',
        file,
        data.id,
        'IMAGE',
        'USER',
        data.id,
      );
      userData['imageUrl'] = fileData?.fileUrl;
      userData['profileImageId'] = fileData?.id;
    } else if (removePicture) {
      userData['imageUrl'] = null;
      userData['profileImageId'] = null;
    }
    if (data.firstname === '') {
      userData.firstname = null;
    }
    if (data.lastname === '') {
      userData.lastname = null;
    }
    if (data.phoneNumber === '') {
      userData.phoneNumber = null;
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
      microserviceEndpoints.events.eventPocsUnlocked
        .replace(':userId', pocId)
        .replace('{unlock}', params.join(',').toLowerCase());
    console.log(url);
    const response = await fetch(url);
    const { data, error } = await response.json();
    if (!data || error) {
      console.log(data, error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return {
      ...data.data,
      id: encrypt(data.id + process.env.TEN_TIMES_ID_ENCRYPT_KEY),
    };
  }
  async createOrGetBullUser(email: string = "bull-admin@10times.com") {
    const user = await this.prisma.user.findUnique({
      where: {
        email: email
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true
      }
    });
    if (!user) {
      return await this.prisma.user.create({
        data: {
          email: email,
          firstname: 'bull',
          lastname: 'admin',
        },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true
        }
      })
    }
    return user;
  }
}
