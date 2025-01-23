import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TCachedUser } from 'src/utils/types';
import { AccountDataService } from './account/account.data.service';
import { UserDataService } from './user.data.service';
import { SharedService } from 'src/shared/shared.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountDataService: AccountDataService,
    private readonly userDataService: UserDataService,
    private readonly sharedService: SharedService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async signOut(token: string) {
    await this.cacheManager.del(token);
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
}
