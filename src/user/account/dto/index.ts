import { createZodDto } from 'nestjs-zod';
import { LimitSchema } from 'src/global_dto';
import { z } from 'zod';

const CreateAccountSchema = z.strictObject({
  membership: z.number().optional(),
  pendingRequests: z.number().optional(),
  pendingPocUnlockRequests: z.number().optional(),
});

export class CreateAccountDto extends createZodDto(CreateAccountSchema) {}

const UpdateAccountSchema = z.strictObject({
  id: z.string().uuid(),
  membership: z.number().optional(),
  pendingRequests: z.number().optional(),
  pendingPocUnlockRequests: z.number().optional(),
});

export class UpdateAccountDto extends createZodDto(UpdateAccountSchema) {}

const GetAccountsSchema = LimitSchema.extend({
  id: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
});

export class GetAccountDto extends createZodDto(GetAccountsSchema) {}
