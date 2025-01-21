import { createZodDto } from 'nestjs-zod';
import { LimitSchema } from 'src/global_dto';
import { z } from 'zod';

const querySuggestion = z.strictObject({
  q: z.string().optional(),
  invites: z.string().optional(),
});
const QueryInviteSchema = querySuggestion.merge(LimitSchema);
export class QueryInvite_Dto extends createZodDto(QueryInviteSchema) {}
const queryInvite = z.strictObject({
  emails: z.string(),
  eventId: z.string(),
  redirectUrl: z.string(),
});
export class  BodyInviteDto extends createZodDto(queryInvite) {}
