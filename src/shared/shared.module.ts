import { Global, Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { FileCreationService } from './file-creation.service';

@Global()
@Module({
  providers: [SharedService, FileCreationService],
  exports: [SharedService, FileCreationService],
})
export class SharedModule {}
