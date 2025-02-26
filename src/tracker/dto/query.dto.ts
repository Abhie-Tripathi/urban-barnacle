import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { LimitSchema } from 'src/global_dto';
import { TrackerType } from '@prisma/client';
import {
  EventTabs,
  ParamsSchema,
  TrackerEventSearchSchema,
  TrackerEventStatus,
  TrackerParamsSchema,
} from './create.dto';
import { CountQuerySchema, QuerySchema } from 'src/events/dto';

const GetTrackersHttpSchema = LimitSchema.extend({
  name: z.string().optional(),
  type: z.enum(['trackers', 'trends']).optional().default('trackers'),
  subType: z.nativeEnum(TrackerType).optional(),
  createdBy: z.enum(['me', 'others']).optional(),
  refresh: z
    .string()
    .refine((val) => val === 'true' || val === 'false')
    .transform((val) => val === 'true')
    .optional(),
});

export class GetTrackersHttpDto extends createZodDto(GetTrackersHttpSchema) {}

const GetTrackersSchema = GetTrackersHttpSchema.extend({
  ids: z.array(z.string().uuid()).optional(),
  accountId: z.string().uuid().optional(),
});

export class GetTrackersDto extends createZodDto(GetTrackersSchema) {}

export class GetTrackersCountDto extends createZodDto(GetTrackersSchema) {}

const GetTrackerEventsSchema = LimitSchema.extend(
  TrackerEventSearchSchema.shape,
)
  .extend({
    type: z
      .string()
      .refine((val) => val in EventTabs)
      .transform((val) => val as keyof typeof EventTabs)
      .optional(),
  })
  .transform((data) => {
    if (data.type && ['business', 'social', 'unattended'].includes(data.type)) {
      data.eventTypeGroup = data.type;
      delete data.type;
    } else if (data.type && ['past', 'active', 'new'].includes(data.type)) {
      data.trackerEventStatus = data.type as keyof typeof TrackerEventStatus;
      delete data.type;
    }
    return data;
  });

export class GetTrackerEventsDto extends createZodDto(GetTrackerEventsSchema) {}

const GetTrackerEventsCountSchema = CountQuerySchema.innerType()
  .extend({
    type: z
      .string()
      .refine((val) => val in EventTabs)
      .transform((val) => val as keyof typeof EventTabs)
      .optional(),
  })
  .transform((data) => {
    if (data.type && ['business', 'social', 'unattended'].includes(data.type)) {
      data.eventTypeGroup = data.type;
      delete data.type;
    }
    return data;
  });

export class GetTrackerEventsCountDto extends createZodDto(
  GetTrackerEventsCountSchema,
) {}

const GetTrackerCommentsSchema = LimitSchema.extend({});

export class GetTrackerCommentDto extends createZodDto(
  GetTrackerCommentsSchema,
) {}

export const GetTrackerByIdSchema = z.object({
  refresh: z
    .string()
    .refine((val) => val === 'true' || val === 'false')
    .transform((val) => val === 'true')
    .optional(),
});
export class GetTrackerByIdDto extends createZodDto(GetTrackerByIdSchema) {}

const GetTrackerUsersSchema = LimitSchema.extend({});

export class GetTrackerUsersDto extends createZodDto(GetTrackerUsersSchema) {}
