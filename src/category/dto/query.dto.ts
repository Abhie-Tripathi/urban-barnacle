import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const SearchCategorySchema = z.object({
  id: z
    .string()
    .optional()
    .transform((data) => {
      return data?.split(',').map((item) => item.trim());
    }),
  slugs: z
    .string()
    .optional()
    .transform((data) => {
      return data?.split(',').map((item) => item.trim());
    }),
  name: z.string().optional(),
  isGroup: z
    .string()
    .refine((val) => val === 'true' || val === 'false')
    .transform((val) => {
      if (val) {
        return val === 'true' ? true : false;
      }
    })
    .optional(),
  isDesignation: z
    .string()
    .refine((val) => val === 'true' || val === 'false')
    .transform((val) => {
      if (val) {
        return val === 'true' ? true : false;
      }
    })
    .optional(),

  take: z.string().optional().default('15').refine(Number).transform(Number),
  skip: z
    .string()
    .default('0')
    .refine((data) => data && !isNaN(parseInt(data)))
    .transform(Number)
    .optional(),
});

export class SearchCategoryDto extends createZodDto(SearchCategorySchema) {}

const DesignationSearchSchema = SearchCategorySchema.omit({ isGroup: true });

export class DesignationSearchDto extends createZodDto(
  DesignationSearchSchema,
) {}
