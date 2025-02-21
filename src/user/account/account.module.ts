import { Global, Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { CompanyModule } from '../company/company.module';
import { AccountDataService } from './account.data.service';
import { AccountService } from './account.service';
import { UserModule } from '../user.module';
import { EnquiryModule } from 'src/enquiry/enquiry.module';
import { IntentModule } from 'src/intent/intent.module';

@Global()
@Module({
  controllers: [AccountController],
  providers: [AccountService, AccountDataService],
  exports: [AccountService, AccountDataService],
  imports: [UserModule, CompanyModule, EnquiryModule, IntentModule],
})
export class AccountModule {}
