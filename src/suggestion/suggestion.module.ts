import { Global, Module } from '@nestjs/common';
import { SuggestionController } from './suggestion.controller';
import { SuggestionService } from './suggestion.service';

@Global()
@Module({
  controllers: [SuggestionController],
  providers: [SuggestionService],
  exports: [SuggestionService],
})
export class SuggestionModule {}
