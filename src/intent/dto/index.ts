import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { IntentTargetModule, IntentType } from '@prisma/client';

export * from './userEventInterest.dto';

const CreateIntentHttpSchema = z.object({
  targetModule: z.nativeEnum(IntentTargetModule),
  targetId: z.string().uuid(),
  intentType: z.nativeEnum(IntentType),
});

export class CreateIntentHttpDto extends createZodDto(CreateIntentHttpSchema) {}

const CreateIntentSchema = CreateIntentHttpSchema.extend({
  userId: z.string().uuid(),
  accountId: z.string().uuid(),
});

export class CreateIntentDto extends createZodDto(CreateIntentSchema) {}

const UpdateIntentSchema = z.object({
  id: z.string().uuid(),
  deleted: z.boolean().optional(),
});

export class UpdateIntentDto extends createZodDto(UpdateIntentSchema) {}

const GetIntentSchema = z.object({
  id: z.string().uuid().optional(),
  targetModule: z.nativeEnum(IntentTargetModule).optional(),
  targetId: z.string().uuid().optional(),
  intentType: z.nativeEnum(IntentType).optional(),
  userId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
});

export class GetIntentDto extends createZodDto(GetIntentSchema) {}
