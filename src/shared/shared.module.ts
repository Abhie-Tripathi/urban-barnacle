import { Global, Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { FileCreationService } from './file-creation.service';
import { IntentDataService } from 'src/intent/intent.data.service';

@Global()
@Module({
  providers: [SharedService, FileCreationService, IntentDataService],
  exports: [SharedService, FileCreationService],
})
export class SharedModule { }
