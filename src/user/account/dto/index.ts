import { createZodDto } from 'nestjs-zod';
import { LimitSchema } from 'src/global_dto';
import { z } from 'zod';
import {
  AccountConfigSchema,
  InterestConfigurationSchema,
} from '../account.config';
import { UserInterestsGroupBy } from 'src/intent/dto';
import { SubscriptionPlan } from '@prisma/client';

const CreateAccountSchema = z.strictObject({
  interestConfig: InterestConfigurationSchema.optional(),
  currentSubscriptionId: z.string()
});

export class CreateAccountDto extends createZodDto(CreateAccountSchema) { }
const CreateSubscriptionSchema = z.strictObject({
  pendingRequests: z.number().optional(),
  pendingPocUnlockRequests: z.number().optional(),
  planEndDate: z.string().transform(val => new Date(val))
});

export class CreateSubscriptionDto extends createZodDto(CreateSubscriptionSchema) { }
const UpdateAccountSchema = z.strictObject({
  id: z.string().uuid(),
  configuration: AccountConfigSchema.extend({
    lastModifiedById: z.string().uuid(),
  }).optional(),
});

export class UpdateAccountDto extends createZodDto(UpdateAccountSchema) { }

const UpdateSubscriptionSchema = z.strictObject({
  plan: z.nativeEnum(SubscriptionPlan).optional(),
  pendingRequests: z.number().optional(),
  pendingPocUnlockRequests: z.number().optional(),
  planEndDate: z.string().optional(),
  planStartDate: z.string().optional(),
  accountId: z.string()
});

export class UpdateSubscriptionDto extends createZodDto(UpdateSubscriptionSchema) { }
const GetAccountsSchema = LimitSchema.extend({
  id: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
});

export class GetAccountDto extends createZodDto(GetAccountsSchema) { }

const AccountConfigKey = z.enum(['interest', 'outreach', 'filter', 'membership']);
export type AccountConfigKey = z.infer<typeof AccountConfigKey>;

const GetAccountEnquiriesCountSchema = z.strictObject({
  type: z.nativeEnum(UserInterestsGroupBy).optional(),
});

export class GetAccountEnquiriesCountDto extends createZodDto(
  GetAccountEnquiriesCountSchema,
) { }

const GetBookmarkedEventSchema = LimitSchema;

export class GetBookmarkedEventDto extends createZodDto(
  GetBookmarkedEventSchema,
) { }



const UpdateSubscriptionFromWebhookSchema = z.strictObject({
  // plan: z.nativeEnum(SubscriptionPlan).optional(),
  // pendingRequests: z.number().optional(),
  // pendingPocUnlockRequests: z.number().optional(),
  planEndDate: z.string().optional(),
  planStartDate: z.string().optional(),
  subscriptionId: z.string(),
  planRenewalDate: z.string().optional(),
});

export class UpdateSubscriptionWebhookDto extends createZodDto(UpdateSubscriptionFromWebhookSchema) { }