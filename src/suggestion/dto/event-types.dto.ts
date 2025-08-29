import { z } from 'zod';
import { SuggestionSchema } from 'src/utils';
import { createZodDto } from 'nestjs-zod';

const EventTypeGroup = {
  BUSINESS: 'business',
  SOCIAL: 'social',
} as const;

export const EventTypeSchema = SuggestionSchema.extend({
  slugs: z
    .string()
    .transform((slugs) => slugs.split(','))
    .optional(),
  type: z
    .string()
    .refine((type) => type.toUpperCase() in EventTypeGroup)
    .transform((type) => type.toUpperCase())
    .optional(),
});

export class EventTypeDto extends createZodDto(EventTypeSchema) {}

export const EventTypeResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  eventGroupType: z.string(),
  groups: z.array(z.string()),
  id_10x: z.number().nullable(),
  priority: z.number().nullable(),
});

export class EventTypeResponseDto extends createZodDto(
  EventTypeResponseSchema,
) {}
