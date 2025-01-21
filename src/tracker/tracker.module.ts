import { Module } from '@nestjs/common';
import { TrackerController } from './tracker.controller';
import { TrackerService } from './tracker.service';
import { TrackerDataService } from './tracker.data.service';
import { UserModule } from 'src/user/user.module';
import { AccessModule } from 'src/access/access.module';
import { EventsModule } from 'src/events/events.module';
import { IntentModule } from 'src/intent/intent.module';
import { CommentModule } from 'src/comment/comment.module';

@Module({
  controllers: [TrackerController],
  providers: [TrackerService, TrackerDataService],
  imports: [
    AccessModule,
    EventsModule,
    IntentModule,
    CommentModule,
    UserModule,
  ],
  exports: [TrackerService, TrackerDataService],
})
export class TrackerModule {}
