import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ExportDataService } from './exports.data.service';
import { EventsModule } from 'src/events/events.module';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  controllers: [ExportsController],
  providers: [ExportsService, ExportDataService],
  imports: [EventsModule],
  exports: [ExportsService, ExportDataService],
})
export class ExportsModule {}
