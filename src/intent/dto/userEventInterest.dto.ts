import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { Interest, InterestSourceModule, InterestStatus } from '@prisma/client';

const CreateUserEventInterestHttpSchema = z.object({
  eventId: z.string().uuid(),
  sourceModule: z.nativeEnum(InterestSourceModule),
  sourceId: z.string().uuid().optional(),
  interest: z.nativeEnum(Interest),
});

export class CreateUserEventInterestHttpDto extends createZodDto(
  CreateUserEventInterestHttpSchema,
) {}

const CreateUserEventInterestSchema = CreateUserEventInterestHttpSchema.extend({
  eventId: z.string().uuid(),
  accountId: z.string().uuid(),
  interestedUserId: z.string().uuid(),
  recommendedBy: z.string().uuid().optional(),
  sourceModule: z.nativeEnum(InterestSourceModule),
  interest: z.nativeEnum(Interest),
  enquiryId: z.string().uuid().optional(),
  sourceId: z.string().uuid().optional(),
});

export class CreateUserEventInterestDto extends createZodDto(
  CreateUserEventInterestSchema,
) {}

const UpdateUserEventInterestHttpSchema = z.object({
  status: z.nativeEnum(InterestStatus).optional(),
  note: z.string().min(3).max(255).optional(),
});

export class UpdateUserEventInterestHttpDto extends createZodDto(
  UpdateUserEventInterestHttpSchema,
) {}

const UpdateUserEventInterestSchema = UpdateUserEventInterestHttpSchema.extend({
  id: z.string().uuid(),
  approvedBy: z.string().uuid().optional(),
  deleted: z.boolean().optional(),
  modifiedBy: z.string().uuid(),
});

export class UpdateUserEventInterestDto extends createZodDto(
  UpdateUserEventInterestSchema,
) {}

const GetUserEventInterestSchema = z.object({
  id: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  enquiryId: z.string().uuid().optional(),
  recommendedBy: z.string().uuid().optional(),
  approvedBy: z.string().uuid().optional(),
  interestedUserId: z.string().uuid().optional(),
  interest: z.nativeEnum(Interest).optional(),
  status: z.nativeEnum(InterestStatus).optional(),
  sourceModule: z.nativeEnum(InterestSourceModule).optional(),
  sourceId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
});

export class GetUserEventInterestDto extends createZodDto(
  GetUserEventInterestSchema,
) {}
