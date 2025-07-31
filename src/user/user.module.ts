import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MeController } from './me/me.controller';
import { AuthController } from './auth/auth.controller';
import { UserDataService } from './user.data.service';
import { CommentService } from 'src/comment/comment.service';
import { IntentDataService } from 'src/intent/intent.data.service';

@Module({
  controllers: [UserController],
  providers: [UserService, UserDataService,IntentDataService],
  exports: [UserService, UserDataService],
})
export class UserModule {}
