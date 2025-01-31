import { Module, forwardRef } from '@nestjs/common';
import { EnquiryController } from './enquiry.controller';
import { EnquiryService } from './enquiry.service';
import { EnquiryDataService } from './enquiry.data.service';
import { IntentModule } from 'src/intent/intent.module';
import { UserModule } from 'src/user/user.module';
import { EventsModule } from 'src/events/events.module';
import { CommentModule } from 'src/comment/comment.module';

@Module({
  imports: [
    forwardRef(() => IntentModule),
    forwardRef(() => UserModule),
    forwardRef(() => CommentModule),
    EventsModule,
  ],
  controllers: [EnquiryController],
  providers: [EnquiryService, EnquiryDataService],
  exports: [EnquiryService, EnquiryDataService],
})
export class EnquiryModule {}
