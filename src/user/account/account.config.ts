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

const InterestSchema = z.object({
  label: z.string(),
  status: z.nativeEnum(Interest),
  position: z.number(),
});

export const InterestConfigurationSchema = z.array(InterestSchema);

export class InterestConfigurationDto extends createZodDto(
  InterestConfigurationSchema,
) {}

export const InterestConfigurationUpdateSchema = z.array(
  InterestSchema.omit({ position: true }),
);

export class InterestConfigurationUpdateDto extends createZodDto(
  InterestConfigurationUpdateSchema,
) {}

const OutreachSchema = z.object({
  label: z.string(),
  status: z.nativeEnum(EnquiryStatus),
  position: z.number(),
});

export const OutreachConfigurationSchema = z.array(OutreachSchema);

export class OutreachConfigurationDto extends createZodDto(
  OutreachConfigurationSchema,
) {}

export const OutreachConfigurationUpdateSchema = z.array(
  OutreachSchema.omit({ position: true }),
);

export class OutreachConfigurationUpdateDto extends createZodDto(
  OutreachConfigurationUpdateSchema,
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
    { label: 'Attend', status: 'ATTEND', position: 0 },
    { label: 'Speak', status: 'SPEAK', position: 1 },
    { label: 'Sponsor', status: 'SPONSOR', position: 2 },
    { label: 'Exhibit', status: 'EXHIBIT', position: 3 },
  ],
  leads: [
    { label: 'Top', status: 'ATTEND', position: 0 },
    { label: 'High', status: 'SPEAK', position: 1 },
    { label: 'Medium', status: 'SPONSOR', position: 2 },
    { label: 'Low', status: 'EXHIBIT', position: 3 },
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
      status: 'PENDING',
      position: 1,
    },
    {
      label: 'In Discussion',
      status: 'IN_DISCUSSION',
      position: 2,
    },
    {
      label: 'Shortlisted',
      status: 'SHORTLISTED',
      position: 3,
    },
    {
      label: 'In Negotiation',
      status: 'IN_NEGOTIATION',
      position: 4,
    },
    {
      label: 'Confirmed',
      status: 'CONFIRMED',
      position: 5,
    },
    {
      label: 'Cancelled',
      status: 'CANCELLED',
      position: 6,
    },
    {
      label: 'Rejected',
      status: 'REJECTED',
      position: 7,
    },
  ],
  filter: {},
};
