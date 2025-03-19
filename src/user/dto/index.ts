import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { SignUpSchema } from '../auth/dto';
import {
  LocationType,
  OnboardingState,
  UserRole,
  UserSource,
} from '@prisma/client';
import { LimitSchema } from 'src/global_dto';
import { UpdateMeSchema } from '../me/dto/update.dto';
import { GeoJsonSchema } from 'src/utils/types';

const CreateUserSchema = SignUpSchema.extend({
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  role: z.nativeEnum(UserRole),
  imageUrl: z.string().optional(),
  accountId: z.string().uuid().optional(),
  primaryAccountId: z.string().uuid().optional(),
  primaryCompanyId: z.string().uuid().optional(),
  currentOnboardingState: z
    .nativeEnum(OnboardingState)
    .default('VERIFICATION')
    .optional(),
  source: z.nativeEnum(UserSource).optional(),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) { }

const GetUserHttpSchema = LimitSchema.extend({});

export class GetUserHttpDto extends createZodDto(GetUserHttpSchema) { }

const GetUsersSchema = GetUserHttpSchema.extend({
  email: z.array(z.string().email()).optional(),
  id: z.array(z.string().uuid()).optional(),
  accountId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
});

export class GetUsersDto extends createZodDto(GetUsersSchema) { }

const UpdateUserSchema = UpdateMeSchema.extend({
  id: z.string().uuid(),
  companyId: z.string().uuid().optional(),
  imageUrl: z.string().optional(),
  deleted: z.boolean().optional(),
  currentOnboardingState: z.nativeEnum(OnboardingState).optional(),
  primaryLocation: z
    .object({
      locationType: z.nativeEnum(LocationType),
      locationId: z.string().uuid().optional(),
      geoJson: GeoJsonSchema.optional(),
    })
    .optional(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
}).strict();

export class UpdateUserDto extends createZodDto(UpdateUserSchema) { }
