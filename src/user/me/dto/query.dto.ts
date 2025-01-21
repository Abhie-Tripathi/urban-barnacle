import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { LimitSchema } from 'src/global_dto';

const GetRecentEventSearchesSchema = LimitSchema.extend({});

export class GetRecentEventSearchesDto extends createZodDto(
  GetRecentEventSearchesSchema,
) {}

const GetMyExports = LimitSchema.extend({
  name: z.string().optional(),
});

export class GetMyExportsDto extends createZodDto(GetMyExports) {}
