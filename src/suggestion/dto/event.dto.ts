import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { LimitSchemaWithoutDefault } from 'src/global_dto';

export const EventSchema = LimitSchemaWithoutDefault.extend({
  query: z.string().optional(),
});

export class EventDto extends createZodDto(EventSchema) {}
