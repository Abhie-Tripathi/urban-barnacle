import { EnquiryStatus, Interest } from '@prisma/client';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { FilterNames } from 'src/events/dto';
import { Industries } from 'src/utils/types';

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

export const InterestConfigurationSchema = z.array(
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

export const InterestDefaultConfigurations: Record<
  string,
  InterestConfigurationDto
> = {
  interests: [
    { label: 'Attend', source: 'research', status: 'ATTEND', position: 0 },
    { label: 'Speak', source: 'research', status: 'SPEAK', position: 1 },
    { label: 'Sponsor', source: 'research', status: 'SPONSOR', position: 2 },
    { label: 'Exhibit', source: 'research', status: 'EXHIBIT', position: 3 },
  ],
  leads: [
    { label: 'Top', source: 'research', status: 'ATTEND', position: 0 },
    { label: 'High', source: 'research', status: 'SPEAK', position: 1 },
    { label: 'Medium', source: 'research', status: 'SPONSOR', position: 2 },
    { label: 'Low', source: 'research', status: 'EXHIBIT', position: 3 },
  ],
};

export const InterestDefaultConfigurationsWithIndustry: Record<
  keyof typeof Industries.gtm,
  InterestConfigurationDto
> = {
  Corporate_Brands: InterestDefaultConfigurations.interests,
  Media_Marketing: InterestDefaultConfigurations.leads,
  Event_Planners: InterestDefaultConfigurations.interests,
  Research_MA: InterestDefaultConfigurations.leads,
  Infra_Technology: InterestDefaultConfigurations.leads,
  Venue_Real_Estate: InterestDefaultConfigurations.leads,
  Others: InterestDefaultConfigurations.interests,
};

export const accountConfig: AccountConfigDto = {
  interest: InterestDefaultConfigurations.interests,
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
