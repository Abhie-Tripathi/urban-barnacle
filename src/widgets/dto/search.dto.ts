import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const AllDataSchema = z.strictObject({
  limit: z
    .string()
    .optional()
    .transform((value) => {
      if (value !== undefined) {
        return parseInt(value, 10);
      }
      return 10;
    }),
  offset: z
    .string()
    .optional()
    .transform((value) => {
      if (value !== undefined) {
        return parseInt(value, 10);
      }
      return 0;
    }),
  status: z.string().optional(),
});

export class Query_Dto extends createZodDto(AllDataSchema) {}

const UELDATA = z.strictObject({
  url: z.string(),
});

export class URL_Dto extends createZodDto(UELDATA) {}
