import { Module } from '@nestjs/common';
import { EnquiryController } from './enquiry.controller';
import { EnquiryService } from './enquiry.service';
import { EnquiryDataService } from './enquiry.data.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [EnquiryController],
  providers: [EnquiryService, EnquiryDataService],
  exports: [EnquiryService, EnquiryDataService],
})
export class EnquiryModule {}
