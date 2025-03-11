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
import { CountQuerySchema, QuerySchema, Show } from 'src/events/dto';
import { defaultEventTypes } from 'src/utils/types';

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
    if (!data.show || data.show.length === 0) {
      data['show'] = (Object.values(Show) as Show[]).filter((item) => {
        return item !== Show.isNew && item !== Show.old;
      });
    }
    if (data.view !== 'map' && !data.limit) {
      data.limit = 10;
    }
    // if (!data.eventTypes || (data.eventTypes && data.eventTypes.length === 0)) {
    //   const backend = process.env.BACKEND;
    //   if (backend && backend in defaultEventTypes) {
    //     data.eventTypes = defaultEventTypes[backend];
    //   }
    // }
    if (!data.sortBy || data.sortBy.length === 0) {
      data.sortBy = ['-score'];
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
    trackerEventStatus: z
      .string()
      .refine((val) => val in TrackerEventStatus)
      .transform((val) => val as keyof typeof TrackerEventStatus)
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

    // if (!data.eventTypes || (data.eventTypes && data.eventTypes.length === 0)) {
    //   const backend = process.env.BACKEND;
    //   if (backend && backend in defaultEventTypes) {
    //     data.eventTypes = defaultEventTypes[backend];
    //   }
    // }

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
