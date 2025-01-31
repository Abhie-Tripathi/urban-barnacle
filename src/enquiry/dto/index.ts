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

const GetEnquiriesSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  eventId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  initiatedBy: z.string().uuid().optional(),
  type: z.nativeEnum(EnquiryActivitySubType).optional(),
  event_active_lte: z.string().datetime().optional(),
  event_active_gte: z.string().datetime().optional(),
  upvotedBy: z.enum(['me', 'others']).optional(),
  userId: z.string().uuid().optional(),
  name: z.string().optional(),
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
