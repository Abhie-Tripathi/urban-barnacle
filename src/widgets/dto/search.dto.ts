import { createZodDto } from 'nestjs-zod';
import { LimitSchema } from 'src/global_dto';
import { z } from 'zod';

const AllDataSchema = z.strictObject({
  status: z.string().optional(),
});
const QueryWidgetSchema = AllDataSchema.merge(LimitSchema);
export class Query_Dto extends createZodDto(QueryWidgetSchema) {}

const UELDATA = z.strictObject({
  url: z.string(),
});

export class URL_Dto extends createZodDto(UELDATA) {}
