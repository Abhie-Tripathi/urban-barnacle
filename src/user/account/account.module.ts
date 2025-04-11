import { Global, Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { CompanyModule } from '../company/company.module';
import { AccountDataService } from './account.data.service';
import { AccountService } from './account.service';
import { UserModule } from '../user.module';
import { EnquiryModule } from 'src/enquiry/enquiry.module';
import { IntentModule } from 'src/intent/intent.module';
import { EventsModule } from 'src/events/events.module';
import { PromotedEventsModule } from 'src/promotedEvent/promoted-event.module';
import { PromotedEventsService } from 'src/promotedEvent/promoted-event.service';
import { PromotedEventsDataService } from 'src/promotedEvent/promoted-even.data.service';
import { PosterService } from 'src/promotedEvent/poster.service';

@Global()
@Module({
  controllers: [AccountController],
  providers: [AccountService, AccountDataService, PromotedEventsService, PromotedEventsDataService, PosterService],
  exports: [AccountService, AccountDataService],
  imports: [EventsModule, PromotedEventsModule, UserModule, CompanyModule, EnquiryModule, IntentModule],
})
export class AccountModule { }
