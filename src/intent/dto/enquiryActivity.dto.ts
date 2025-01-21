import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EnquiryActivitySubType, EnquiryActivityType } from '@prisma/client';

const CreateEnquiryActivityHttpSchema = z.object({
  enquiryId: z.string().uuid(),
  activityType: z.nativeEnum(EnquiryActivityType),
  activitySubType: z.nativeEnum(EnquiryActivitySubType).optional(),
});

export class CreateEnquiryActivityHttpDto extends createZodDto(
  CreateEnquiryActivityHttpSchema,
) {}

const CreateEnquiryActivitySchema = CreateEnquiryActivityHttpSchema.extend({
  userId: z.string().uuid(),
  accountId: z.string().uuid(),
});

export class CreateEnquiryActivityDto extends createZodDto(
  CreateEnquiryActivitySchema,
) {}

const UpdateEnquiryActivitySchema = z.object({
  id: z.string().uuid(),
  deleted: z.boolean().optional(),
});

export class UpdateEnquiryActivityDto extends createZodDto(
  UpdateEnquiryActivitySchema,
) {}

const GetEnquiryActivitySchema = z.object({
  id: z.string().uuid().optional(),
  enquiryId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  activityType: z.nativeEnum(EnquiryActivityType).optional(),
  activitySubType: z.nativeEnum(EnquiryActivitySubType).optional(),
  accountId: z.string().uuid().optional(),
});

export class GetEnquiryActivityDto extends createZodDto(
  GetEnquiryActivitySchema,
) {}
