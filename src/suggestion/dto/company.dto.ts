import { z } from 'zod';
import { SuggestionSchema } from '.';
import { createZodDto } from 'nestjs-zod';

export const CompanySchema = z.object({
  query: z.string(),
});

export class CompanyDto extends createZodDto(CompanySchema) {}

export const CompanyResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  website: z.string().nullable(),
  host: z.string().nullable(),
  location: z
    .object({
      cityName: z.string().nullable(),
      countryCode: z.string().nullable(),
      countryName: z.string().nullable(),
      countryZone: z.string().nullable(),
    })
    .nullable(),
  stats: z
    .object({
      totalOrganize: z.number(),
      totalExhibit: z.number(),
      totalSponsor: z.number(),
    })
    .nullable(),
});

export class CompanyResponseDto extends createZodDto(CompanyResponseSchema) {}
