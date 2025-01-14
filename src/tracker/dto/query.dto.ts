import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { LimitSchema } from 'src/global_dto';
import { TrackerType } from '@prisma/client';

const QuerySchema = z.object({
  name: z.string().optional(),
});

export class QueryDto extends createZodDto(QuerySchema) {}

const GetTrackersSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  name: z.string().optional(),
  type: z.enum(['trackers', 'trends']).optional().default('trackers'),
  accountId: z.string().uuid().optional(),
  createdBy: z.enum(['me', 'others']).optional(),
});

export class GetTrackersDto extends createZodDto(
  GetTrackersSchema.extend(LimitSchema.shape),
) {}

export class GetTrackersCountDto extends createZodDto(GetTrackersSchema) {}
