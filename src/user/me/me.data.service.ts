import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, UserActivitySource } from '@prisma/client';
import { TCachedUser } from 'src/utils/types';
import { GetRecentEventSearchesDto } from './dto';
import * as crypto from 'crypto';
import { decrypt } from 'src/utils';
@Injectable()
export class MeDataService {
  constructor(private readonly prisma: PrismaService) {}

  async getLastRequest(user: TCachedUser, path: string) {
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

  async getRecentEventSearches(
    user: TCachedUser,
    params: GetRecentEventSearchesDto,
  ) {
    const { limit, offset } = params;
    const recentSearches = await this.prisma.userActivity.findMany({
      where: {
        userId: user.id,
        accountId: user.accountId,
        path: '/events',
        source: params.source.toUpperCase() as UserActivitySource,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      distinct: ['request'],
      take: limit,
      skip: offset,
    });
    return recentSearches.map((data) => {
      return {
        filterValues: JSON.parse(decrypt((data.request as any).data)),
        requestedAt: data.updatedAt,
      };
    });
  }
}
