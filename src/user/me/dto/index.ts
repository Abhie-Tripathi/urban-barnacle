export * from './query.dto';
export * from './update.dto';

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { PrimaryLocationSchema } from 'src/utils/types';

export const UserDataSchema = z.object({
  id: z.string(),
  firstname: z.string().nullable(),
  lastname: z.string().nullable(),
  email: z.string(),
  primaryLocation: PrimaryLocationSchema.nullable(),
  phoneNumber: z.string().nullable(),
  imageUrl: z.string().nullable(),
  industry: z.string().nullable(),
  subIndustry: z.string().nullable(),
  category: z.string().nullable(),
  designation: z.string().nullable(),
  department: z.string().nullable(),
});
export const UserResponseSchema = z.object({
  userData: UserDataSchema,
  token: z.string(),
});

export const SwitchAccountSchema = z.object({
  accountId: z.string(),
});

export class SwitchAccountDto extends createZodDto(SwitchAccountSchema) {}
