import { forwardRef, Module } from '@nestjs/common';
import { SavedLocationController } from './saved-location.controller';
import { SavedLocationService } from './saved-location.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SavedLocationDataService } from './saved-location.data.service';
import { SuggestionModule } from 'src/suggestion/suggestion.module';
import { SharedModule } from 'src/shared/shared.module';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/user/auth/auth.module';

@Module({
  controllers: [SavedLocationController],
  providers: [SavedLocationService, SavedLocationDataService],
  imports: [
    PrismaModule,
    SharedModule,
    SuggestionModule,
    UserModule,
    AuthModule,
  ],
  exports: [SavedLocationService],
})
export class SavedLocationModule {}
