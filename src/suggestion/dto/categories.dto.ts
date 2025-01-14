import { z } from 'zod';
import { SuggestionSchema } from '.';
import { createZodDto } from 'nestjs-zod';

export const CategorySchema = SuggestionSchema.extend({
  slugs: z
    .string()
    .transform((slugs) => slugs.split(','))
    .optional(),
});

export class CategoryDto extends createZodDto(CategorySchema) {}

export const CategoryResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  id_10x: z.number().nullable(),
});

export class CategoryResponseDto extends createZodDto(CategoryResponseSchema) {}
