import { Module } from '@nestjs/common';
import { InviteService } from './invite.service';
import { InviteController } from './invite.controller';
import { InviteDataService } from './invite.data.service';
import { IntendService } from 'src/intend/intend.service';
import { IntendDataService } from 'src/intend/intend.data.service';
import { UserDataService } from 'src/user/user.data.service';

@Module({
  controllers: [InviteController],
  providers: [
    InviteService,
    InviteDataService,
    IntendService,
    IntendDataService,
    UserDataService,
  ],
})
export class InviteModule {}
