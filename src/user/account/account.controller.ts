import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccountService } from './account.service';
import { AuthGuard } from '../auth/guard';
import { GetUser } from '../decorator';
import { TCachedUser } from 'src/utils/types';
import { GetEnquiriesDto } from 'src/enquiry/dto';
import { GetUserHttpDto } from '../dto';
import {
  AccountConfigDto,
  FilterConfigurationDto,
  InterestConfigurationDto,
  OutreachConfigurationDto,
} from './account.config';
import { AccountConfigKey, GetAccountEnquiriesCountDto } from './dto';

@Controller('me/account')
export class AccountController {
  constructor(private readonly accountService: AccountService) { }

  @UseGuards(AuthGuard)
  @Get('company')
  async getAccountCompany(@GetUser() user: TCachedUser) {
    try {
      const company = await this.accountService.getAccountCompany(user);
      return { data: company };
    } catch (error) {
      return { error: error };
    }
  }
  @UseGuards(AuthGuard)
  @Get('latest-comment')
  async getLatestComment(@GetUser() user: TCachedUser) {
    try {
      const company = await this.accountService.getLatestComment(user);
      return { data: company };
    } catch (error) {
      return { error: error };
    }
  }
  @UseGuards(AuthGuard)
  @Get('enquiries')
  async getAccountEnquiries(
    @GetUser() user: TCachedUser,
    @Query() query: GetEnquiriesDto,
  ) {
    try {
      const enquiries = await this.accountService.getAccountEnquiries(
        user,
        query,
      );
      return { data: enquiries };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Get('enquiries/count')
  async getAccountEnquiriesCount(
    @GetUser() user: TCachedUser,
    @Query() query: GetAccountEnquiriesCountDto,
  ) {
    try {
      const count = await this.accountService.getAccountEnquiriesCount(
        user,
        query,
      );
      return { data: { count } };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Get('users')
  async getAccountUsers(
    @GetUser() user: TCachedUser,
    @Query() query: GetUserHttpDto,
  ) {
    try {
      const users = await this.accountService.getAccountUsers(user, query);
      return { data: users };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Get('configuration/:key')
  async getAccountConfiguration(
    @GetUser() user: TCachedUser,
    @Param('key') key: AccountConfigKey,
  ) {
    try {
      const configuration = await this.accountService.getAccountConfiguration(
        user,
        key,
      );
      return { data: configuration };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Put('configuration/interest')
  async updateAccountConfigurationInterest(
    @GetUser() user: TCachedUser,
    @Body() data: InterestConfigurationDto,
  ) {
    try {
      const configuration =
        await this.accountService.updateAccountConfiguration(
          user,
          'interest',
          data,
        );
      return { data: configuration };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Put('configuration/outreach')
  async updateAccountConfigurationOutreach(
    @GetUser() user: TCachedUser,
    @Body() data: OutreachConfigurationDto,
  ) {
    try {
      const configuration =
        await this.accountService.updateAccountConfiguration(
          user,
          'outreach',
          data,
        );
      return { data: configuration };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Put('configuration/filter')
  async updateAccountConfigurationFilter(
    @GetUser() user: TCachedUser,
    @Body() data: FilterConfigurationDto,
  ) {
    try {
      const configuration =
        await this.accountService.updateAccountConfiguration(
          user,
          'filter',
          data,
        );
      return { data: configuration };
    } catch (error) {
      return { error: error };
    }
  }
}
