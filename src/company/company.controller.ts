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
    try {
      const [{ point }, membershipStatus] = await Promise.all([
        this.sharedService.getPointForRequest(
          PointColumn.pendingRequests,
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
      const result = await this.companyService.getCompanyProspectData(
        query,
        'list',
      );
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
  @Get(':companyId/events')
  async getCompanyEvents(
    @Param('companyId') compnayId: string,
    @Query() query: CompanyEventDto,
    @GetUser() userData: TCachedUser,
  ) {
    try {
      const result = await this.companyService.getCompnayEvents(
        compnayId,
        query,
        userData,
      );
      return result;
    } catch (error) {
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
    // let flag = false;
    try {
      console.log({ compnayId });
      // const point = await this.sharedService.getPointForRequest(PointColumn.pendingCompanySearchRequests, userData.accountId);
      // if (point <= 0) {
      //   throw new Error('You have reached the maximum limit to view data. Please get in touch with us.');
      // }
      const result = await this.companyService.getCompanyProspectData(
        { companyId: compnayId, limit: 10, offset: 0 },
        'detail',
      );
      // await this.sharedService.deductPointForRequest(PointColumn.pendingCompanySearchRequests, userData.accountId, point - 1)
      // flag = true;
      return result;
    } catch (error) {
      // if (flag)
      //   this.sharedService.creditPointForRequest(PointColumn.pendingCompanySearchRequests, userData.accountId)
      return { error: error };
    }
  }
}
