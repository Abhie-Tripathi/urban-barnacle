import { Module } from '@nestjs/common';
import { IntendService } from './intend.service';
import { IntendController } from './intend.controller';
import { IntendDataService } from './intend.data.service';
import { UserModule } from 'src/user/user.module';
import { AccountModule } from 'src/user/account/account.module';
import { AccountDataService } from 'src/user/account/account.data.service';
import { UserDataService } from 'src/user/user.data.service';

@Module({
  controllers: [IntendController],
  providers: [
    IntendService,
    IntendDataService,
    // UserDataService,
    // AccountDataService,
  ],
  imports: [UserModule, AccountModule],
  exports: [IntendService, IntendDataService],
})
export class IntendModule {}
