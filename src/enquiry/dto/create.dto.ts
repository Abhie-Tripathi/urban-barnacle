import { EnquiryActivitySubType, EnquiryStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateEnquirySchema = z.object({
  eventId: z.string().uuid(),
  accountId: z.string().uuid(),
  initiatedBy: z.string().uuid(),
  eventData: z.record(z.string(), z.any()),
});

export class CreateEnquiryDto extends createZodDto(CreateEnquirySchema) {}

const UpdateEnquirySchema = z.object({
  id: z.string().uuid(),
  status: z.nativeEnum(EnquiryStatus).optional(),
  ownerId: z.string().uuid().optional(),
  deleted: z.boolean().optional(),
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
});

export class GetEnquiriesDto extends createZodDto(GetEnquiriesSchema) {}
