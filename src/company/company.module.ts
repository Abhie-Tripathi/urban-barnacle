import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { IntentDataService } from 'src/intent/intent.data.service';

@Module({
  controllers: [CompanyController],
  providers: [CompanyService,IntentDataService],
})
export class CompaniesModule {}
