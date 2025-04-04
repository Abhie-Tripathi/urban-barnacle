import { Global, Module } from '@nestjs/common';
import { SuggestionController } from './suggestion.controller';
import { SuggestionService } from './suggestion.service';
import { SuggestionDataService } from './suggestion.data.service';
import { EventsDataService } from 'src/events/events.data.service';
import { TrackerDataService } from 'src/tracker/tracker.data.service';

@Global()
@Module({
  controllers: [SuggestionController],
  providers: [
    SuggestionService,
    SuggestionDataService,
    EventsDataService,
    TrackerDataService,
  ],
  exports: [SuggestionService],
})
export class SuggestionModule {}
