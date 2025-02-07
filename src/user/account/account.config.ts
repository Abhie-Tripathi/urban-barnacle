import { EnquiryStatus, Interest } from '@prisma/client';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { FilterNames } from 'src/events/dto';

export enum FilterGroup {
  BASIC = 'basic',
  ADVANCE = 'advance',
  INSIGHT = 'insight',
  AUDIENCE = 'audience',
}

const filerValueKeys = FilterNames;

export const filterValueSchema = z.object({
  allowedValues: z.array(z.string()),
  group: z.nativeEnum(FilterGroup),
});

const InterestConfigurationSchema = z.array(
  z.object({
    label: z.string(),
    source: z.string(),
    status: z.nativeEnum(Interest),
    position: z.number(),
  }),
);

export class InterestConfigurationDto extends createZodDto(
  InterestConfigurationSchema,
) {}

const OutreachConfigurationSchema = z.array(
  z.object({
    label: z.string(),
    source: z.string(),
    status: z.nativeEnum(EnquiryStatus),
    position: z.number(),
  }),
);

export class OutreachConfigurationDto extends createZodDto(
  OutreachConfigurationSchema,
) {}

// const FilterConfigurationSchema = z.record(z.string(), filterValueSchema);
const FilterConfigurationSchema = z.record(z.string(), z.any());

export class FilterConfigurationDto extends createZodDto(
  FilterConfigurationSchema,
) {}

export const AccountConfigSchema = z.strictObject({
  interest: InterestConfigurationSchema,
  outreach: OutreachConfigurationSchema,
  filter: FilterConfigurationSchema,
});

export class AccountConfigDto extends createZodDto(AccountConfigSchema) {}

export const accountConfig: AccountConfigDto = {
  interest: [
    {
      label: 'Bookmark',
      source: 'research',
      status: 'BOOKMARK',
      position: 1,
    },
    {
      label: 'Speak',
      source: 'research',
      status: 'SPEAK',
      position: 2,
    },
    {
      label: 'Sponsor',
      source: 'research',
      status: 'SPONSOR',
      position: 3,
    },
    {
      label: 'Attend',
      source: 'research',
      status: 'ATTEND',
      position: 4,
    },
    {
      label: 'Exhibit',
      source: 'research',
      status: 'EXHIBIT',
      position: 5,
    },
  ],
  outreach: [
    {
      label: 'Pending',
      source: 'coordinate',
      status: 'PENDING',
      position: 1,
    },
    {
      label: 'In Discussion',
      source: 'outreach',
      status: 'IN_DISCUSSION',
      position: 2,
    },
    {
      label: 'Shortlisted',
      source: 'outreach',
      status: 'SHORTLISTED',
      position: 3,
    },
    {
      label: 'In Negotiation',
      source: 'outreach',
      status: 'IN_NEGOTIATION',
      position: 4,
    },
    {
      label: 'Confirmed',
      source: 'outreach',
      status: 'CONFIRMED',
      position: 5,
    },
    {
      label: 'Cancelled',
      source: 'coordinate',
      status: 'CANCELLED',
      position: 6,
    },
    {
      label: 'Rejected',
      source: 'coordinate',
      status: 'REJECTED',
      position: 7,
    },
  ],
  filter: {},
};
