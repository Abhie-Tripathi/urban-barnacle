import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { BullModule } from '@nestjs/bull';

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
  providers: [UserService, MeService, AuthService],
})
export class UserModule {}
