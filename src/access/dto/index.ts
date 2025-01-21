import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { AccessType } from '@prisma/client';
import { AccessSourceEntity } from '@prisma/client';
import { LimitSchema } from 'src/global_dto';

const CreateAccessHttpSchema = z.object({
  sourceEntity: z.nativeEnum(AccessSourceEntity),
  sourceEntityId: z.string(),
  accessReceiverId: z.string().uuid(),
  accessType: z.nativeEnum(AccessType),
});

export class CreateAccessHttpDto extends createZodDto(CreateAccessHttpSchema) {}

const createAccessSchema = CreateAccessHttpSchema.extend({
  accessProviderId: z.string().uuid(),
  accountId: z.string().uuid(),
});

export class CreateAccessDto extends createZodDto(createAccessSchema) {}

const UpdateAccessHttpSchema = z.object({
  accessType: z.nativeEnum(AccessType),
});

export class UpdateAccessHttpDto extends createZodDto(UpdateAccessHttpSchema) {}

const UpdateAccessSchema = UpdateAccessHttpSchema.partial().extend({
  id: z.string().uuid(),
  deleted: z.boolean().optional(),
});

export class UpdateAccessDto extends createZodDto(UpdateAccessSchema) {}

// const GetAccessHttpSchema = LimitSchema.extend({
//   accessReceiverId: z.string().uuid().optional(),
//   accessProviderId: z.string().uuid().optional(),
//   accessTypes: z.nativeEnum(AccessType).array().optional(),
//   sourceEntity: z.nativeEnum(AccessSourceEntity).optional(),
//   sourceEntityId: z.string().optional(),
// });

// export class GetAccessHttpDto extends createZodDto(GetAccessHttpSchema) {}
const showAccess = {
  user: 'user',
};

const GetAccessSchema = LimitSchema.extend({
  id: z.string().uuid().optional(),
  accountId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  accessReceiverId: z.string().uuid().optional(),
  accessProviderId: z.string().uuid().optional(),
  accessTypes: z.nativeEnum(AccessType).array().optional(),
  sourceEntity: z.nativeEnum(AccessSourceEntity).optional(),
  sourceEntityId: z.string().optional(),
  show: z
    .string()
    .refine((val) => val.split(',').every((val) => val in showAccess))
    .optional(),
});

export class GetAccessDto extends createZodDto(GetAccessSchema) {}
