import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { AccessType } from '@prisma/client';
import { AccessSourceEntity } from '@prisma/client';
import { LimitSchema } from 'src/global_dto';

const CreateAccessHttpSchema = z.object({
  accessReceiverId: z.string().uuid().optional(),
  accessReceiverEmail: z.string().email().optional(),
  redirectDomain: z.string().optional(),
  accessType: z
    .string()
    .refine(
      (val) =>
        Object.values(AccessType).includes(val.toUpperCase() as AccessType),
      {
        message: 'Invalid access type',
        params: {
          values: Object.values(AccessType),
        },
      },
    )
    .transform((val) => val.toUpperCase() as AccessType),
  flagForEmail: z.boolean().default(true)
});

export class CreateAccessHttpDto extends createZodDto(CreateAccessHttpSchema) { }

const createAccessSchema = CreateAccessHttpSchema.extend({
  sourceEntity: z.nativeEnum(AccessSourceEntity),
  sourceEntityId: z.string(),
  accessProviderId: z.string().uuid(),
  accountId: z.string().uuid(),
  redirectQueryParams: z.string().optional(),
  token: z.string().optional(),
  expiry: z.date().optional(),
  flagForEmail: z.boolean().default(true)
});

export class CreateAccessDto extends createZodDto(createAccessSchema) { }

const UpdateAccessHttpSchema = CreateAccessHttpSchema.pick({
  accessType: true,
});

export class UpdateAccessHttpDto extends createZodDto(UpdateAccessHttpSchema) { }

const UpdateAccessSchema = UpdateAccessHttpSchema.partial().extend({
  id: z.string().uuid(),
  deleted: z.boolean().optional(),
});

export class UpdateAccessDto extends createZodDto(UpdateAccessSchema) { }

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
  accountId: z.string().uuid().optional(),
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

export class GetAccessDto extends createZodDto(GetAccessSchema) { }

const GetAccessCountSchema = GetAccessSchema.omit({
  show: true,
  limit: true,
  offset: true,
});

export class GetAccessCountDto extends createZodDto(GetAccessCountSchema) { }
