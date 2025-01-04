import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const querySuggestion = z.strictObject({
  q: z.string().optional(),
  take: z.string().optional().default('5'),
  skip: z.string().optional().default('0'),
  invites: z.string().optional(),
});
export class QueryInvite_Dto extends createZodDto(querySuggestion) {}
const queryInvite = z.strictObject({
  emails: z.string(),
  eventId: z.string(),
  redirectUrl: z.string(),
});
export class  BodyInviteDto extends createZodDto(queryInvite) {}
