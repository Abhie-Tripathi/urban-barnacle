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
    });
    return enquiries;
  }

  async getAccountUsers(user: TCachedUser, query: GetUserHttpDto) {
    const users = await this.userDataService.getUsers({
      accountId: user.accountId,
      ...query,
    });
    return users;
  }

  async getAccountConfiguration(user: TCachedUser) {
    const configuration = await this.accountDataService.getAccountConfiguration(
      user.accountId,
    );
    return configuration;
  }

  async updateAccountConfiguration(user: TCachedUser, data: AccountConfigDto) {
    const configuration = await this.accountDataService.updateAccount({
      id: user.accountId,
      configuration: {
        ...data,
        lastModifiedById: user.id,
      },
    });
    return configuration;
  }
}
