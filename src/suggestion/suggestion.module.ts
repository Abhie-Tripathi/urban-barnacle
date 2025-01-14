import { Global, Module } from '@nestjs/common';
import { SuggestionController } from './suggestion.controller';
import { SuggestionService } from './suggestion.service';
import { SuggestionDataService } from './suggestion.data.service';

@Global()
@Module({
  controllers: [SuggestionController],
  providers: [SuggestionService, SuggestionDataService],
  exports: [SuggestionService],
})
export class SuggestionModule {}
