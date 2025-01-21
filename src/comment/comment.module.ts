import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AccessModule } from 'src/access/access.module';
import { EnquiryModule } from 'src/enquiry/enquiry.module';
import { IntentModule } from 'src/intent/intent.module';
import { CommentDataService } from './comment.data.service';

@Module({
  providers: [CommentService, CommentDataService],
  controllers: [CommentController],
  imports: [AccessModule, IntentModule, EnquiryModule],
  exports: [CommentService, CommentDataService],
})
export class CommentModule {}
