import { Module, forwardRef } from '@nestjs/common';
import { EnquiryController } from './enquiry.controller';
import { EnquiryService } from './enquiry.service';
import { EnquiryDataService } from './enquiry.data.service';
import { IntentModule } from 'src/intent/intent.module';
import { UserModule } from 'src/user/user.module';
import { EventsModule } from 'src/events/events.module';
import { IntentService } from 'src/intent/intent.service';
import { IntentDataService } from 'src/intent/intent.data.service';
import { UserDataService } from 'src/user/user.data.service';

@Module({
  controllers: [EnquiryController],
  providers: [
    EnquiryService,
    EnquiryDataService,
    IntentDataService,
    UserDataService,
  ],
  exports: [EnquiryService, EnquiryDataService],
})
export class EnquiryModule {}
