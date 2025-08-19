import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { SharedService } from 'src/shared/shared.service';
import { PointColumn } from 'src/shared/types';
import { ProspectSchemaDto } from 'src/shared/shared.dto';
import { GetUser } from 'src/user/decorator';
import { membershipLimit, TCachedUser } from 'src/utils/types';
import { AuthGuard } from 'src/user/auth/guard';
import { CompanyEventDto } from './dto';

@Controller('companies')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly sharedService: SharedService,
  ) { }
  @UseGuards(AuthGuard)
  @Get('search')
  async searchCompany(
    @Query() query: ProspectSchemaDto,
    @GetUser() userData: TCachedUser,
  ) {
    let flag = false;
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
      const result = await this.companyService.getCompanyProspectData(
        query,
        'list',
      );
      totalpointsToDeduct = Array.isArray(result.data.companyData) ? result.data.companyData.length : 1;
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
  @Get(':companyId/events')
  async getCompanyEvents(
    @Param('companyId') compnayId: string,
    @Query() query: CompanyEventDto,
    @GetUser() user: TCachedUser,
  ) {
    let flag = false;
    let advanceDataFromResponse: boolean = false;
    let totalpointsToDeduct: number = 0;
    try {
      const [{ point, advancePoint }, membershipStatus] = await Promise.all([this.sharedService.getPointForRequest(
        PointColumn.pendingRequests,
        user.accountId,
        PointColumn.advancePendingRequests
      ), this.sharedService.
        getAccountMemberShipStatus(user.accountId)]);
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
      if (query.limit && query.limit > point) {
        query.limit = point;
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
      const result = await this.companyService.getCompnayEvents(
        compnayId,
        query,
        user,
      );
      await this.sharedService.deductPointForRequest(
        advanceDataFromResponse ? PointColumn.advancePendingRequests : PointColumn.pendingRequests,
        user.accountId,
        advanceDataFromResponse ? advancePoint - totalpointsToDeduct : point - totalpointsToDeduct,
        // (advanceDataFromResponse ? PointColumn.advancePendingRequests : null),
        // (advanceDataFromResponse ? advancePoint - 1 : 0),
      );
      flag = true;
      return result;
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
  @UseGuards(AuthGuard)
  @Get(':companyId/pocs')
  async getCompanyPocs(
    @Param('companyId') compnayId: string,
    @GetUser() userData: TCachedUser,
  ) {
    try {
      const result = await this.companyService.getCompanyPoc(compnayId);
      return result;
    } catch (error) {
      return { error: error };
    }
  }
  @UseGuards(AuthGuard)
  @Get(':companyId')
  async getCompanyDetails(
    @Param('companyId') compnayId: string,
    @GetUser() userData: TCachedUser,
  ) {
    let flag = false;
    try {
      console.log({ compnayId });
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
      // const point = await this.sharedService.getPointForRequest(PointColumn.pendingCompanySearchRequests, userData.accountId);
      // if (point <= 0) {
      //   throw new Error('You have reached the maximum limit to view data. Please get in touch with us.');
      // }
      // if (query.limit && membershipLimit[membershipStatus.membership].perSearchLimit < query.limit) {
      //   query.limit = membershipLimit[membershipStatus.membership].perSearchLimit;
      // }
      if (point <= 0) {
        throw new HttpException(
          'You have reached the maximum limit to view data. Please get in touch with us.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      // if ((membershipLimit[membershipStatus.membership].upperLimit - ((query.limit || 10) + (query.offset || 0))) < 0) {
      //   throw new HttpException(
      //     'The server couldn’t understand the request due to invalid syntax or parameters.',
      //     HttpStatus.BAD_REQUEST,
      //   );
      // }
      const result = await this.companyService.getCompanyProspectData(
        { companyId: compnayId, limit: 10, offset: 0 },
        'detail',
      );
      const totalpointsToDeduct: number = Array.isArray(result.data.companyData) ? result.data.companyData.length : 1;
      // await this.sharedService.deductPointForRequest(PointColumn.pendingCompanySearchRequests, userData.accountId, point - 1)
      // flag = true;
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
      // if (flag)
      //   this.sharedService.creditPointForRequest(PointColumn.pendingCompanySearchRequests, userData.accountId)
      return { error: error };
    }
  }
}
