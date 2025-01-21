import { Module } from '@nestjs/common';
import { CompanyDataService } from './company.data.service';

@Module({
  controllers: [],
  providers: [CompanyDataService],
  exports: [CompanyDataService],
})
export class CompanyModule {}
