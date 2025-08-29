import { Module } from '@nestjs/common';
import { OthersService } from './others.service';
import { OthersController } from './others.controller';
import { OthersDataService } from './others.data.service';
import { UserDataService } from 'src/user/user.data.service';
import { AccessDataService } from 'src/access/access.data.service';

@Module({
  controllers: [OthersController],
  providers: [OthersService, OthersDataService, UserDataService,AccessDataService],
})
export class OthersModule { }
