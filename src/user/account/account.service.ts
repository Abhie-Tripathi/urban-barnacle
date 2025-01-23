import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AccountDataService } from './account.data.service';
import { TCachedUser } from 'src/utils/types';
import { CompanyDataService } from '../company/company.data.service';
import { CompanyResponseSchema } from '../company/dto';
import { EnquiryService } from 'src/enquiry/enquiry.service';
import { GetEnquiriesDto } from 'src/enquiry/dto';
import { GetUserHttpDto } from '../dto';
import { UserService } from '../user.service';
import { UserDataService } from '../user.data.service';
import { Prisma } from '@prisma/client';
import { AccountConfigDto } from './account.config';
import { UserDataSchema } from '../me/dto';
import { AccountConfigKey } from './dto';

@Injectable()
export class AccountService {
  constructor(
    private readonly accountDataService: AccountDataService,
    private readonly companyDataService: CompanyDataService,
    private readonly enquiryService: EnquiryService,
    private readonly userDataService: UserDataService,
  ) {}

  async getAccountCompany(user: TCachedUser) {
    const company = await this.companyDataService.getCompany({
      accountId: user.accountId,
    });
    return CompanyResponseSchema.parse(company);
  }

  async getAccountEnquiries(user: TCachedUser, query: GetEnquiriesDto) {
    const enquiries = await this.enquiryService.getEnquiries({
      accountId: user.accountId,
      ...query,
    });
    return enquiries;
  }

  async getAccountUsers(user: TCachedUser, query: GetUserHttpDto) {
    const users = await this.userDataService.getUsers({
      accountId: user.accountId,
      ...query,
    });
    return users.map((user) => ({
      id: user.id,
      name:
        user.firstname || user.lastname
          ? `${user.firstname} ${user.lastname || ''}`
          : user.email.split('@')[0],
      email: user.email,
      imageUrl: user.imageUrl,
    }));
  }

  async getAccountConfiguration(user: TCachedUser, key: AccountConfigKey) {
    const configuration = await this.accountDataService.getAccountConfiguration(
      user.accountConfigurationId,
    );
    return { [key]: configuration ? configuration[key] : [] };
  }

  async updateAccountConfiguration(
    user: TCachedUser,
    key: AccountConfigKey,
    data: AccountConfigDto[keyof AccountConfigDto],
  ) {
    const config = await this.accountDataService.getAccountConfiguration(
      user.accountConfigurationId,
    );
    if (!config) {
      return [];
    }
    config[key as string] = data;
    const configuration = (
      await this.accountDataService.updateAccountConfiguration(
        user,
        config as unknown as AccountConfigDto,
      )
    ).config;

    return { [key]: configuration ? configuration[key] : [] };
  }
}
