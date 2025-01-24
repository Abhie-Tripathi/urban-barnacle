import { Module } from '@nestjs/common';
import { AccessController } from './access.controller';
import { AccessService } from './access.service';
import { AccessDataService } from './access.data.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { CompanyModule } from 'src/user/company/company.module';

@Module({
  controllers: [AccessController],
  providers: [AccessService, AccessDataService],
  exports: [AccessService, AccessDataService],
  imports: [UserModule, CompanyModule],
})
export class AccessModule {}
