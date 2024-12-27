import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const querySugg = z.strictObject({
  q: z.string(),
  limit: z.string().optional().default('15'),
  offset: z.string().optional().default('0'),
});
export class Query_Dto extends createZodDto(querySugg) {}
