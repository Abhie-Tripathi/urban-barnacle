import { Module } from '@nestjs/common';
import { OthersService } from './others.service';
import { OthersController } from './others.controller';
import { OthersDataService } from './others.data.service';

@Module({
  controllers: [OthersController],
  providers: [OthersService, OthersDataService],
})
export class OthersModule { }
