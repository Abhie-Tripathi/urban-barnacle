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
import { LimitDto } from 'src/global_dto';

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
    let advanceDataFromResponse: boolean = false;
    let totalpointsToDeduct: number = 0;
    try {
      const [{ point }, membershipStatus] = await Promise.all([
        this.sharedService.getPointForRequest(
          PointColumn.pendingCompanySearchRequests,
          userData.accountId,
          PointColumn.advancePendingRequests
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
      if ((membershipLimit[membershipStatus.membership].upperLimit - ((query.limit || 10) + (query.offset || 0))) < 0) {
        throw new HttpException(
          'The server couldn’t understand the request due to invalid syntax or parameters.',
          HttpStatus.FORBIDDEN,
        );
      }
      if (query.limit && query.limit > point) {
        query.limit = point;
      }
      const result = await this.userService.getUserProspectData(query, userData);
      totalpointsToDeduct = Array.isArray(result.data.userData) ? result.data.userData.length : 1;
      await this.sharedService.deductPointForRequest(
        PointColumn.pendingCompanySearchRequests,
        userData.accountId,
        point - totalpointsToDeduct,
      );
      flag = true;
      return result;
    } catch (error) {
      if (flag)
        this.sharedService.creditPointForRequest(
          PointColumn.pendingCompanySearchRequests,
          userData.accountId,
          totalpointsToDeduct
        );
      return { error: error };
    }
  }
  @UseGuards(AuthGuard)
  @Get('saved-users')
  async getSavedUsers(@Query() query: LimitDto, @GetUser() userData: TCachedUser,) {
    try {
      const result = await this.userService.getSavedUsers(query, userData);
      return result;
    } catch (error) {
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
    let flag = false;
    try {
      let points: number = 0;
      if (!query.unmask && !query.target && !query.source) {
        const [{ point }, membershipStatus] = await Promise.all([
          this.sharedService.getPointForRequest(
            PointColumn.pendingCompanySearchRequests,
            userData.accountId,
            PointColumn.advancePendingRequests
          ),
          this.sharedService.getAccountMemberShipStatus(
            userData.accountId,
          ),
        ]);
        if (point <= 0) {
          throw new HttpException(
            'You have reached the maximum limit to view data. Please get in touch with us.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        points = point
      }
      const result = await this.userService.getUserData(query, userId, userData);
      if (!query.unmask && !query.target && !query.source) {
        await this.sharedService.deductPointForRequest(
          PointColumn.pendingCompanySearchRequests,
          userData.accountId,
          points - 1,
        );
        flag = true;
      }
      return result;
    } catch (error) {
      if (flag && !query.unmask && !query.target && !query.source)
        this.sharedService.creditPointForRequest(
          PointColumn.pendingCompanySearchRequests,
          userData.accountId,
        );
      return { error: error };
    }
  }
  @UseGuards(AuthGuard)
  @Get(':userId/events')
  async getUserEvent(
    @Param('userId') userId,
    @Query() query: CompanyEventDto,
    @GetUser() user: TCachedUser,
  ) {
    let flag = false;
    let advanceDataFromResponse: boolean = false;
    let totalpointsToDeduct: number = 0;
    let point: number = 0;
    let advancePoint: number = 0;
    try {
      if (!query.groupBy) {
        const [tokenDetails, membershipStatus] = await Promise.all([this.sharedService.getPointForRequest(
          PointColumn.pendingRequests,
          user.accountId,
          PointColumn.advancePendingRequests
        ), this.sharedService.
          getAccountMemberShipStatus(user.accountId)]);
        point = tokenDetails.point
        advancePoint = tokenDetails.advancePoint
        // if (point <= 0) {
        //   throw new HttpException(
        //     'You have reached the maximum limit to view data. Please get in touch with us.',
        //     HttpStatus.TOO_MANY_REQUESTS,
        //   );
        // }
        // if (point <= 0 && advancePoint !== 0 && Math.abs(point) >= (advancePoint * 0.5)) {
        //   throw new HttpException(
        //     'You have reached your daily limit. It will reset tomorrow.',
        //     HttpStatus.BAD_REQUEST,
        //     { cause: `{"advanceToken":${advancePoint > 0},"basicToken":${Math.abs(point) >= (advancePoint * 0.5)}}` }
        //   );
        // }
        if (query.limit && membershipLimit[membershipStatus.membership].perSearchLimit < query.limit) {
          query.limit = membershipLimit[membershipStatus.membership].perSearchLimit;
        }
        if ((membershipLimit[membershipStatus.membership].upperLimit - ((query.limit || 10) + (query.offset || 0))) < 0) {
          throw new HttpException(
            'The server couldn’t understand the request due to invalid syntax or parameters.',
            HttpStatus.FORBIDDEN,
          );
        }
        // if ((membershipLimit[membershipStatus.membership] - ((query.limit || 10) + (query.offset || 0))) < 0) {
        //   throw new HttpException(
        //     'You have reached the maximum limit to view data. Please get in touch with us.',
        //     HttpStatus.TOO_MANY_REQUESTS,
        //   );
        // }
        // const queryDto: QueryDto = {
        //   ...query,
        //   showValues:
        //     query.view === 'suggestion'
        //       ? 'suggestion'
        //       : query.showValues,
        // };
        if (query.limit && query.limit > point) {
          query.limit = point;
        }
      }
      const events = await this.userService.getUserEvent(userId, query) as any;
      totalpointsToDeduct = events.data['events'] && Array.isArray(events.data['events']) ? events.data.events.length : 1;
      if (!query.groupBy) {
        await this.sharedService.deductPointForRequest(
          advanceDataFromResponse ? PointColumn.advancePendingRequests : PointColumn.pendingRequests,
          user.accountId,
          advanceDataFromResponse ? advancePoint - totalpointsToDeduct : point - totalpointsToDeduct,
          // (advanceDataFromResponse ? PointColumn.advancePendingRequests : null),
          // (advanceDataFromResponse ? advancePoint - 1 : 0),
        );
        flag = true;
      }
      return events
    } catch (error) {
      if (flag)
        this.sharedService.creditPointForRequest(
          advanceDataFromResponse ? PointColumn.advancePendingRequests : PointColumn.pendingRequests,
          user.accountId,
          totalpointsToDeduct
          // (advanceDataFromResponse ? : null),
        );
      return { error: error };
    }
  }
}
