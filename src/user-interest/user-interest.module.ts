import { Module } from '@nestjs/common';
import { UserInterestService } from './user-interest.service';
import { UserInterestController } from './user-interest.controller';
import { EnquiryController } from './enquiry.controller';
import { EnquiryService } from './enquiry.service';

@Module({
  controllers: [UserInterestController, EnquiryController],
  providers: [UserInterestService, EnquiryService],
})
export class UserInterestModule {}
