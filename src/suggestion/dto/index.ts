import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { LimitSchema } from '../../global_dto';
import { SuggestionSchema } from 'src/utils';

export class SuggestionDto extends createZodDto(SuggestionSchema) { }

export * from './categories.dto';
export * from './event-types.dto';
export * from './locations.dto';


export const TrackerSchema = LimitSchema.extend({
  query: z.string()
});

export class TrackerDto extends createZodDto(TrackerSchema) { }