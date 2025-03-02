import { EnquiryActivitySubType, EnquiryStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { LimitSchema } from 'src/global_dto';
import { z } from 'zod';

const eventDataSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string(),
  name_lower: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  logoUrl: z.string().nullable(),
  organizerName: z.string().nullable(),
  location: z.object({
    cityName: z.string().nullable(),
    stateName: z.string().nullable().optional(),
    countryName: z.string().nullable(),
  }),
});

const CreateEnquirySchema = z.object({
  eventId: z.string().uuid(),
  accountId: z.string().uuid(),
  initiatedBy: z.string().uuid(),
  eventData: eventDataSchema,
});

export class CreateEnquiryDto extends createZodDto(CreateEnquirySchema) {}

const UpdateEnquiryHttpSchema = z.object({
  status: z.nativeEnum(EnquiryStatus).optional(),
  ownerId: z.string().uuid().optional(),
});

export class UpdateEnquiryHttpDto extends createZodDto(
  UpdateEnquiryHttpSchema,
) {}

const UpdateEnquirySchema = z.object({
  id: z.string().uuid(),
  status: z.nativeEnum(EnquiryStatus).optional(),
  ownerId: z.string().uuid().optional(),
});

export class UpdateEnquiryDto extends createZodDto(UpdateEnquirySchema) {}

export enum UpvotedBy {
  me = 'me',
  others = 'others',
}

export const GetEnquiriesHttpSchema = z.strictObject({
  eventId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  initiatedBy: z.string().uuid().optional(),
  type: z
    .string()
    .optional()
    .transform((val) =>
      val ? (val.toUpperCase().split(',') as EnquiryActivitySubType[]) : val,
    ),
  status: z
    .string()
    .refine(
      (val) =>
        val
          .split(',')
          .every((status) =>
            Object.values(EnquiryStatus).includes(
              status.trim().toUpperCase() as EnquiryStatus,
            ),
          ),
      {
        message: 'Invalid status',
        params: {
          values: Object.values(EnquiryStatus).map((status) =>
            status.toLowerCase(),
          ),
        },
      },
    )
    .transform((val) =>
      val
        .split(',')
        .map((status) => status.trim().toUpperCase() as EnquiryStatus),
    )
    .optional(),
  event_active_lte: z.string().datetime().optional(),
  event_active_gte: z.string().datetime().optional(),
  upvotedBy: z
    .string()
    .refine((val) =>
      val.split(',').every((v) => v.trim().toLowerCase() in UpvotedBy),
    )
    .transform((val) =>
      val.split(',').map((v) => v.trim().toLowerCase() as UpvotedBy),
    )
    .optional(),
  name: z.string().optional(),
  groupBy: z.enum(['status']).optional(),
});

export class GetEnquiriesHttpDto extends createZodDto(
  LimitSchema.extend(GetEnquiriesHttpSchema.shape),
) {}

export const GetEnquiriesSchema = GetEnquiriesHttpSchema.extend({
  ids: z.array(z.string().uuid()).optional(),
  userId: z.string().uuid().optional(),
  upvotedBy: z.array(z.nativeEnum(UpvotedBy)).optional(),
});

export class GetEnquiriesDto extends createZodDto(
  LimitSchema.extend(GetEnquiriesSchema.shape),
) {}

export class GetEnquiryCountDto extends createZodDto(GetEnquiriesSchema) {}

const SetEnquiryOwnerHttpSchema = z.object({
  ownerId: z.string().uuid(),
});

export class SetEnquiryOwnerHttpDto extends createZodDto(
  SetEnquiryOwnerHttpSchema,
) {}

export enum UserInterest {
  attend = 'attend',
  speak = 'speak',
  exhibit = 'exhibit',
  sponsor = 'sponsor',
}
