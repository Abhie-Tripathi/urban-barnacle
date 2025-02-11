import { createZodDto } from 'nestjs-zod';
import { LimitSchema } from 'src/global_dto';
import { z } from 'zod';
import {
  AccountConfigSchema,
  InterestConfigurationSchema,
} from '../account.config';
import { UserInterestsGroupBy } from 'src/intent/dto';

const CreateAccountSchema = z.strictObject({
  membership: z.number().optional(),
  pendingRequests: z.number().optional(),
  pendingPocUnlockRequests: z.number().optional(),
  interestConfig: InterestConfigurationSchema.optional(),
});

export class CreateAccountDto extends createZodDto(CreateAccountSchema) {}

const UpdateAccountSchema = z.strictObject({
  id: z.string().uuid(),
  membership: z.number().optional(),
  pendingRequests: z.number().optional(),
  pendingPocUnlockRequests: z.number().optional(),
  configuration: AccountConfigSchema.extend({
    lastModifiedById: z.string().uuid(),
  }).optional(),
});

export class UpdateAccountDto extends createZodDto(UpdateAccountSchema) {}

const GetAccountsSchema = LimitSchema.extend({
  id: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
});

export class GetAccountDto extends createZodDto(GetAccountsSchema) {}

const AccountConfigKey = z.enum(['interest', 'outreach', 'filter']);
export type AccountConfigKey = z.infer<typeof AccountConfigKey>;

const GetAccountEnquiriesCountSchema = z.strictObject({
  type: z.nativeEnum(UserInterestsGroupBy).optional(),
});

export class GetAccountEnquiriesCountDto extends createZodDto(
  GetAccountEnquiriesCountSchema,
) {}
