import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { SignUpSchema } from '../auth/dto';
import { OnboardingState, UserRole } from '@prisma/client';
import { LimitSchema } from 'src/global_dto';
import { UpdateMeSchema } from '../me/dto/update.dto';

const CreateUserSchema = SignUpSchema.extend({
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  role: z.nativeEnum(UserRole),
  imageUrl: z.string().optional(),
  accountId: z.string().uuid(),
  companyId: z.string().uuid().optional(),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}

const GetUsersSchema = LimitSchema.extend({
  email: z.array(z.string().email()).optional(),
  id: z.array(z.string().uuid()).optional(),
  accountId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
});

export class GetUsersDto extends createZodDto(GetUsersSchema) {}

const UpdateUserSchema = UpdateMeSchema.extend({
  id: z.string().uuid(),
  companyId: z.string().uuid().optional(),
  imageUrl: z.string().optional(),
  deleted: z.boolean().optional(),
  currentOnboardingState: z.nativeEnum(OnboardingState).optional(),
});

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
