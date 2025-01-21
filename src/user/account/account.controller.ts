import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { AccountService } from './account.service';
import { AuthGuard } from '../auth/guard';
import { GetUser } from '../decorator';
import { TCachedUser } from 'src/utils/types';
import { GetEnquiriesDto } from 'src/enquiry/dto';
import { GetUserHttpDto } from '../dto';
import { AccountConfigDto } from './account.config';

@Controller('me/account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @UseGuards(AuthGuard)
  @Get('company')
  async getAccountCompany(@GetUser() user: TCachedUser) {
    try {
      const company = await this.accountService.getAccountCompany(user);
      return { data: company };
    } catch (error) {
      return { error: error.message };
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
      return { error: error.message };
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
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard)
  @Get('configuration')
  async getAccountConfiguration(@GetUser() user: TCachedUser) {
    try {
      const configuration =
        await this.accountService.getAccountConfiguration(user);
      return { data: configuration };
    } catch (error) {
      return { error: error.message };
    }
  }

  @UseGuards(AuthGuard)
  @Patch('configuration')
  async updateAccountConfiguration(
    @GetUser() user: TCachedUser,
    @Body() data: AccountConfigDto,
  ) {
    try {
      const configuration =
        await this.accountService.updateAccountConfiguration(user, data);
      return { data: configuration };
    } catch (error) {
      return { error: error.message };
    }
  }
}
