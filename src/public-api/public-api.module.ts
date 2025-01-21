import { Module } from '@nestjs/common';
import { PublicApiService } from './public-api.service';
import { PublicApiController } from './public-api.controller';
import { PublicApiDataService } from './public-api.data.service';

@Module({
  controllers: [PublicApiController],
  providers: [PublicApiService, PublicApiDataService],
})
export class PublicApiModule {}
