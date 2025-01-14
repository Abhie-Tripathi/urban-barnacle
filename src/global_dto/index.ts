import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const LimitSchema = z.object({
  limit: z
    .string()
    .refine((value) => !isNaN(parseInt(value)), {
      message: 'Limit must be a number',
    })
    .optional()
    .default('10'),
  offset: z
    .string()
    .refine((value) => !isNaN(parseInt(value)), {
      message: 'Offset must be a number',
    })
    .optional()
    .default('0'),
});

export class LimitDto extends createZodDto(LimitSchema) {}
