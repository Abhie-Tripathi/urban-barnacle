import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateCompanySchema = z.strictObject({
  name: z.string(),
  domain: z.string().transform((domain) => domain.toLowerCase()),
  accountId: z.string().uuid(),
});

export class CreateCompanyDto extends createZodDto(CreateCompanySchema) {}

const UpdateCompanySchema = z.strictObject({
  id: z.string().uuid(),
  name: z.string().optional(),
  website: z
    .string()
    .transform((website) => website.toLowerCase())
    .optional(),
  imageUrl: z.string().optional(),
});

export class UpdateCompanyDto extends createZodDto(UpdateCompanySchema) {}

const GetCompanySchema = z.strictObject({
  id: z.string().uuid().optional(),
  domain: z
    .string()
    .transform((domain) => domain.toLowerCase())
    .optional(),
  accountId: z.string().uuid().optional(),
});

export class GetCompanyDto extends createZodDto(GetCompanySchema) {}

export const CompanyResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  domain: z.string(),
  website: z.string().optional(),
  imageUrl: z.string().optional(),
});

export class CompanyResponseDto extends createZodDto(CompanyResponseSchema) {}
