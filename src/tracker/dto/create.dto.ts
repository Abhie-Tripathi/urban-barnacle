import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  EventsTrendsSchema,
  QueryFilter,
  QueryHttpSchema,
  QuerySchema,
  View,
} from 'src/events/dto';
import { TrackerType } from '@prisma/client';

export const SearchByEntity = {
  company: 'company',
  user: 'user',
  speaker: 'speaker',
};

export const TrackerEventStatus = {
  past: 'past',
  active: 'active',
  new: 'new',
};

export const TrackerEventTypeGroup = {
  business: 'busniness',
  social: 'social',
  unattended: 'unattended',
};

export const EventTabs = { ...TrackerEventTypeGroup, ...TrackerEventStatus };

export const TrackerQuerySchema = z.object({
  orgName: z.string().optional(),
  // orgId: z.string().optional(),
  orgWebsite: z.string().optional(),
  userName: z.string().optional(),
  userOrgWebsite: z.string().optional(),
  // userSocialLink: z.string().optional(),
  // userDepartment: z.string().optional(),
  // userRole: z.string().optional(),
  // userDesignation: z.string().optional(),
  searchByEntity: z
    .string()
    .refine((val) => val in SearchByEntity)
    .transform((val) => val as keyof typeof SearchByEntity)
    .optional(),
  trackerEventStatus: z
    .string()
    .refine((val) => val in TrackerEventStatus)
    .transform((val) => val as keyof typeof TrackerEventStatus)
    .optional(),
  createdAt: z
    .string()
    .refine(
      (date) =>
        date &&
        new Date(date).toISOString().split('T')[0] === date.split('T')[0],
    )
    .transform((date) => new Date(date).toISOString().split('T')[0])
    .optional(),
});
export const TrackerParamsSchema = QueryFilter.extend(TrackerQuerySchema.shape);
export const TrackerEventSearchSchema = QueryHttpSchema.innerType()
  .extend(TrackerQuerySchema.shape)
  .extend({
    view: z.nativeEnum(View).optional().default(View.tracker),
  });
export const ParamsSchema = TrackerParamsSchema.extend(
  EventsTrendsSchema.shape,
).partial({
  columns: true,
  groupBy: true,
  dateView: true,
});

export interface LastActive {
  last_active_gte: string;
  last_active_lte: string;
}

export type TrackerParams = z.infer<typeof TrackerParamsSchema>;
export interface TrackerParamsOptions extends LastActive, TrackerParams { }

const CreateTrackerSchema = z.object({
  name: z.string(),
  filterValues: ParamsSchema.strict(),
  type: z.nativeEnum(TrackerType),
  cachingFlag: z.boolean().default(true)
});

export class CreateTrackerDto extends createZodDto(CreateTrackerSchema) { }

const UpdateTrackerHttpSchema = CreateTrackerSchema.partial().omit({
  type: true,
});

export class UpdateTrackerHttpDto extends createZodDto(
  UpdateTrackerHttpSchema,
) { }

const UpdateTrackerSchema = UpdateTrackerHttpSchema.extend({
  id: z.string().uuid(),
  deleted: z.boolean().optional(),
});

export class UpdateTrackerDto extends createZodDto(UpdateTrackerSchema) { }
