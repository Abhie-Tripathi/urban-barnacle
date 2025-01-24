import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateAccessDto,
  CreateAccessHttpDto,
  GetAccessDto,
  UpdateAccessDto,
} from './dto';
import { TCachedUser } from 'src/utils/types';

@Injectable()
export class AccessDataService {
  constructor(private readonly prisma: PrismaService) {}

  async createAccess(data: CreateAccessDto) {
    const { accessReceiverEmail, accessReceiverId, ...rest } = data;
    if (!accessReceiverId) {
      throw new HttpException(
        'Access receiver id is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const access = await this.prisma.access.create({
      data: {
        ...rest,
        accessReceiverId: accessReceiverId,
        lastModifiedBy: data.accessProviderId,
      },
    });
    // send invite
    return access;
  }

  async getAccess(data: GetAccessDto, includesToken: boolean = false) {
    const { accessTypes, show, limit, offset, ...params } = data;
    if (accessTypes) {
      params['accessType'] = {
        in: accessTypes,
      };
    }
    const access = await this.prisma.access.findMany({
      where: {
        ...params,
        token: includesToken ? { not: null } : undefined,
      },
      include: {
        accessReceiver: (show && show.includes('user')) || false,
      },
      take: limit,
      skip: offset,
    });
    return access;
  }

  async updateAccess(userId: string, data: UpdateAccessDto) {
    const access = await this.prisma.access.update({
      where: { id: data.id },
      data: {
        ...data,

        lastModifiedBy: userId,
      },
    });
    return access;
  }
}
