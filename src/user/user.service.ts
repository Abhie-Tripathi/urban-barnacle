import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TCachedUser } from 'src/utils/types';
import { AccountDataService } from './account/account.data.service';
import { UserDataService } from './user.data.service';
import { SharedService } from 'src/shared/shared.service';
import { ProspectSchemaDto } from 'src/shared/shared.dto';
import {
  PocUnmaskDto,
  pocUnmaskSchemaMandate,
  UserSchemaDto,
} from './dto/user.search.dto';
import { PointColumn } from 'src/shared/types';
import { UnlockType, UnlockValue } from '@prisma/client';
import { decrypt } from 'src/utils';
import { validate as isUUID } from 'uuid';
import { CompanyEventDto } from 'src/company/dto';
import { RedisService } from 'src/redis/redis.service';
@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountDataService: AccountDataService,
    private readonly userDataService: UserDataService,
    private readonly sharedService: SharedService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly redisService: RedisService,
  ) { }

  async signOut(token: string) {
    await this.redisService.del(token);
    return {
      message: 'Successfully logged out',
    };
  }

  async switchAccount(user: TCachedUser, accountId: string) {
    const account = await this.accountDataService.getAccounts({
      id: accountId,
      userId: user.id,
      limit: 1,
      offset: 0,
    })[0];
    if (!account) {
      throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
    }
    const [signOutUser, signInUser] = await Promise.all([
      await this.signOut(user.token),
      await this.sharedService.UserResponse({
        ...user,
        accountId: account.id,
      }),
    ]);
    if (signOutUser.message !== 'Successfully logged out') {
      throw new HttpException(
        'Failed to sign out current account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return {
      user: signInUser,
    };
  }
  async getUserProspectData(query: ProspectSchemaDto) {
    return await this.sharedService.getCompanyAndUserDataForProspect(
      query,
      'list',
      'user',
    );
  }
  async getPocsUnmasked(pocId: string, query: PocUnmaskDto, user: TCachedUser) {
    pocId = decrypt(pocId).replace(process.env.TEN_TIMES_ID_ENCRYPT_KEY!, '');
    if (query.target === 'COMPANY' && query.targetId) {
      query.targetId = decrypt(query.targetId).replace(
        process.env.TEN_TIMES_ID_ENCRYPT_KEY!,
        '',
      );
    }
    const [checkForEntry, { point, subscriptionId }] = await Promise.all([
      this.userDataService.getPocUnlockedDatabyAccount(
        user.accountId,
        query.targetId,
        query.source,
        pocId,
      ),
      this.sharedService.getPointForRequest(
        query.target === 'EVENT'
          ? PointColumn.pendingPocUnlockRequests
          : PointColumn.pendingProspectPocUnlockRequests,
        user.accountId,
        PointColumn.advancePendingRequests
      ),
    ]);

    if (point <= 0) {
      throw new HttpException(
        'Limit exceeded for POC viewing',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const unlockedValues = new Set<String>(
      checkForEntry.map((entry) => entry.unlockValue),
    );
    let countForSeenUnlockValue = -1;

    if (point < 2) {
      countForSeenUnlockValue = point;
    }

    let remainingUnmask: string[] = [];

    for (const val of query.unmask.toUpperCase().split(',')) {
      if (unlockedValues.has(val)) {
        const entry = checkForEntry.find((entry) => entry.unlockValue === val);
        if (entry) {
          this.userDataService.updatePocUnlockedTransaction(entry.id);
        }
      } else {
        await this.userDataService.craetePocunlockedTransaction(
          user,
          query.targetId,
          query.source,
          pocId,
          val as UnlockValue,
          query.target,
        );
        remainingUnmask.push(val);
        countForSeenUnlockValue--;
        if (countForSeenUnlockValue === 0) {
          break;
        }
      }
    }
    if (countForSeenUnlockValue === 0) {
      query.unmask = query.unmask.replace('email', '').replace(',', '');
    }
    const pocUnlockedData = await this.userDataService.getPocsunlocked(
      pocId,
      query.unmask.toUpperCase().split(',') as UnlockValue[],
    );
    console.log(pocUnlockedData);
    if (pocUnlockedData && (!pocUnlockedData['email'] || pocUnlockedData['email'].length < 1)) {
      remainingUnmask = remainingUnmask.filter(val => val !== 'EMAIL');
    }
    if (pocUnlockedData && (!pocUnlockedData['phoneNumber'] || pocUnlockedData['phoneNumber'].length < 1)) {
      remainingUnmask = remainingUnmask.filter(val => val !== 'PHONE');
    }
    console.log(remainingUnmask);

    if (remainingUnmask.length > 0) {
      await this.sharedService.deductPointForRequest(
        query.target === 'COMPANY' || query.target === 'EVENT'
          ? PointColumn.pendingPocUnlockRequests
          : PointColumn.pendingProspectPocUnlockRequests,
        user.accountId,
        point - remainingUnmask.length,
      );
    }

    return {
      data: pocUnlockedData
    };
  }
  async getUserData(
    query: UserSchemaDto,
    userId: string,
    userData: TCachedUser,
  ) {
    if (query.unmask && query.target && query.source) {
      return await this.getPocsUnmasked(
        userId,
        pocUnmaskSchemaMandate.parse(query),
        userData,
      );
    }
    if (isUUID(userId)) {
      return {};
    } else if (!isUUID(userId)) {
      return await this.sharedService.getCompanyAndUserDataForProspect(
        { userId: userId, limit: 10, offset: 0 },
        'detail',
        'user',
      );
    }
  }
  async getUserEvent(userId: string, query: CompanyEventDto) {
    if (!isUUID(userId))
      return await this.sharedService.getProspectEventAndMap(userId, {
        ...query,
        type: 'user',
      });
    throw new HttpException(`user not found`, 404);
  }
}
