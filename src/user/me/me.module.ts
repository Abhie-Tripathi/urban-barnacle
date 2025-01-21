import { Module } from '@nestjs/common';
import { TrackerModule } from 'src/tracker/tracker.module';
import { SavedLocationModule } from 'src/saved-location/saved-location.module';
import { ExportsModule } from 'src/exports/exports.module';
import { MeDataService } from './me.data.service';
import { MeService } from './me.service';
import { MeController } from './me.controller';
import { UserModule } from '../user.module';

@Module({
  imports: [UserModule, TrackerModule, SavedLocationModule, ExportsModule],
  controllers: [MeController],
  providers: [MeService, MeDataService],
  exports: [MeService, MeDataService],
})
export class MeModule {}
