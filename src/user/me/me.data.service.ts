import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { TCachedUser } from 'src/utils/types';
import { GetRecentEventSearchesDto } from './dto';
import * as crypto from 'crypto';
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
        filterValues: JSON.parse(this.decrypt((data.request as any).data)),
        requestedAt: data.updatedAt,
      };
    });
  }
  decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-cbc';
    const secretKey = crypto
      .createHash('sha256')
      .update(String(process.env.EVENT_QUERY_ENCRYPT))
      .digest('base64')
      .substr(0, 32);
    const iv = Buffer.from(process.env.EVENT_CHIPR_IV ?? '', 'hex');

    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    return decrypted;
  }
}
