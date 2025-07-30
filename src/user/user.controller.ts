import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ProspectSchemaDto } from 'src/shared/shared.dto';
import { UserSchemaDto } from './dto/user.search.dto';
import { AuthGuard } from './auth/guard';
import { SharedService } from 'src/shared/shared.service';
import { PointColumn } from 'src/shared/types';
import { GetUser } from './decorator';
import { membershipLimit, TCachedUser } from 'src/utils/types';
import { CompanyEventDto } from 'src/company/dto';

@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly sharedService: SharedService,
  ) { }
  @UseGuards(AuthGuard)
  @Get('search')
  async getUserProspectData(
    @Query() query: ProspectSchemaDto,
    @GetUser() userData: TCachedUser,
  ) {
    let flag = false;
    try {
      const [{point}, membershipStatus] = await Promise.all([
        this.sharedService.getPointForRequest(
          PointColumn.pendingRequests,
          userData.accountId,
        ),
        this.sharedService.getAccountMemberShipStatus(
          userData.accountId,
        ),
      ]);
      // if (point <= 0) {
      //   throw new HttpException(
      //     'You have reached the maximum limit to view data. Please get in touch with us.',
      //     HttpStatus.TOO_MANY_REQUESTS,
      //   );
      // }
      if (query.limit && membershipLimit[membershipStatus.membership].perSearchLimit < query.limit) {
        query.limit = membershipLimit[membershipStatus.membership].perSearchLimit;
      }
      if (point <= 0) {
        throw new HttpException(
          'You have reached the maximum limit to view data. Please get in touch with us.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      const result = await this.userService.getUserProspectData(query);
      await this.sharedService.deductPointForRequest(
        PointColumn.pendingCompanySearchRequests,
        userData.accountId,
        point - 1,
      );
      flag = true;
      return result;
    } catch (error) {
      if (flag)
        this.sharedService.creditPointForRequest(
          PointColumn.pendingCompanySearchRequests,
          userData.accountId,
        );
      return { error: error };
    }
  }
  @UseGuards(AuthGuard)
  @Get(':userId')
  async getUserData(
    @Param('userId') userId,
    @Query() query: UserSchemaDto,
    @GetUser() userData: TCachedUser,
  ) {
    try {
      return await this.userService.getUserData(query, userId, userData);
    } catch (error) {
      return { error: error };
    }
  }
  @UseGuards(AuthGuard)
  @Get(':userId/events')
  async getUserEvent(
    @Param('userId') userId,
    @Query() query: CompanyEventDto,
    @GetUser() userData: TCachedUser,
  ) {
    try {
      return await this.userService.getUserEvent(userId, query);
    } catch (error) {
      return { error: error };
    }
  }
}
