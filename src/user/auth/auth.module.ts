import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDataService } from './auth.data.service.dto';
import { AuthController } from './auth.controller';
import { UserModule } from '../user.module';
import { CompanyModule } from '../company/company.module';
import { AccountModule } from '../account/account.module';
import { AccessModule } from 'src/access/access.module';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthDataService],
  exports: [AuthService, AuthDataService],
  imports: [UserModule, CompanyModule, AccountModule, AccessModule],
})
export class AuthModule {}
