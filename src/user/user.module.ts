import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MeController } from './me/me.controller';
import { MeService } from './me/me.service';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { BullModule } from '@nestjs/bull';
import { UserDataService } from './user.data.service';
import { AccountDataService } from './account/account.data.service';
import { CompanyDataService } from './company/company.data.service';
import { AuthDataService } from './auth/auth.data.service.dto';

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: 'otpProcessor',
      },
      { name: 'accessProcessor' },
    ),
  ],
  controllers: [UserController, MeController, AuthController],
  providers: [
    UserService,
    MeService,
    AuthService,
    UserDataService,
    AccountDataService,
    CompanyDataService,
    AuthDataService,
  ],
})
export class UserModule {}
