import { createZodDto } from 'nestjs-zod';
import { LimitSchema } from 'src/global_dto';
import { z } from 'zod';

const queryToGetIntentUser = z.strictObject({
  widgetId: z.string().optional(),
  eventId: z.string(),
  status: z.string().optional(),
  interest: z.string().optional(),
  sortType: z.string().optional(),
  sortBy: z.string().optional(),
  name: z.string().optional(),
});
const mergeLimit = queryToGetIntentUser.merge(LimitSchema);
export class QueryIntend_Dto extends createZodDto(mergeLimit) {}
