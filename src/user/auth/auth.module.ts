import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDataService } from './auth.data.service.dto';
import { AuthController } from './auth.controller';
import { UserModule } from '../user.module';
import { CompanyModule } from '../company/company.module';
import { AccountModule } from '../account/account.module';
import { AccessModule } from 'src/access/access.module';
import { WidgetsModule } from 'src/widgets/widgets.module';
import { KitService } from 'src/widgets/kit.service';
import { WidgetDataService } from 'src/widgets/widget.data.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthDataService, KitService, WidgetDataService],
  exports: [AuthService, AuthDataService],
  imports: [UserModule, CompanyModule, AccountModule, AccessModule],
})
export class AuthModule { }
