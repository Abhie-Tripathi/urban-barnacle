import { Module } from '@nestjs/common';
import { IntentController } from './intent.controller';
import { IntentService } from './intent.service';
import { IntentDataService } from './intent.data.service';

@Module({
  controllers: [IntentController],
  providers: [IntentService, IntentDataService],
  exports: [IntentService, IntentDataService],
})
export class IntentModule {}
