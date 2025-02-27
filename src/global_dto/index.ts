import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const LimitSchema = z.object({
  limit: z
    .string()
    .transform((val) => val || '10')
    .refine((value) => !isNaN(parseInt(value)), {
      message: 'Limit must be a number',
    })
    .transform((val) => parseInt(val))
    .optional()
    .default('10'),
  offset: z
    .string()
    .transform((val) => val || '0')
    .refine((value) => !isNaN(parseInt(value)), {
      message: 'Limit must be a number',
    })
    .transform((val) => parseInt(val))
    .optional()
    .default('0'),
});

export class LimitDto extends createZodDto(LimitSchema) {}

export const LimitSchemaWithoutDefault = z.object({
  limit: z
    .string()
    .transform((val) => val || '10')
    .refine((value) => !isNaN(parseInt(value)), {
      message: 'Limit must be a number',
    })
    .transform((val) => parseInt(val))
    .optional(),
  offset: z
    .string()
    .transform((val) => val || '0')
    .refine((value) => !isNaN(parseInt(value)), {
      message: 'Limit must be a number',
    })
    .transform((val) => parseInt(val))
    .optional(),
});

export class LimitDtoWithoutDefault extends createZodDto(
  LimitSchemaWithoutDefault,
) {}
