import { EnquiryStatus, Interest, SubscriptionPlan } from '@prisma/client';
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
    status: z.nativeEnum(Interest),
  }),
);

export class InterestConfigurationDto extends createZodDto(
  InterestConfigurationSchema,
) { }

export const OutreachConfigurationSchema = z.array(
  z.object({
    label: z.string(),
    status: z.nativeEnum(EnquiryStatus),
  }),
);

export class OutreachConfigurationDto extends createZodDto(
  OutreachConfigurationSchema,
) { }

// const FilterConfigurationSchema = z.record(z.string(), filterValueSchema);
const FilterConfigurationSchema = z.record(z.string(), z.any());

export class FilterConfigurationDto extends createZodDto(
  FilterConfigurationSchema,
) { }
const membershipSchema = z.strictObject({
  token: z.string(),
  plan: z.union([
    z.literal(0),
    z.literal(10),
    z.literal(20),
    z.literal(30),
    z.literal(40)
  ]).transform((value) => {
    const membershipMap: Record<number, SubscriptionPlan> = {
      0: "BASIC",
      10: "ESSENTIAL",
      20: "SCALE",
      30: "ADVANCE",
      40: "ENTERPRISE",
    };
    return membershipMap[value];
  }),
  startDate: z.string(),
  endDate: z.string(),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  {
    message: "startDate must not be later than endDate",
    path: ["startDate"],
  }
);

export class MembershipDto extends createZodDto(
  membershipSchema,
) { }
export const AccountConfigSchema = z.strictObject({
  interest: InterestConfigurationSchema,
  outreach: OutreachConfigurationSchema,
  filter: FilterConfigurationSchema,
});

export class AccountConfigDto extends createZodDto(AccountConfigSchema) { }

export const InterestDefaultConfigurations: Record<
  string,
  InterestConfigurationDto
> = {
  interests: [
    { label: 'Attend', status: 'ATTEND' },
    { label: 'Speak', status: 'SPEAK' },
    { label: 'Sponsor', status: 'SPONSOR' },
    { label: 'Exhibit', status: 'EXHIBIT' },
  ],
  leads: [
    { label: 'Top', status: 'ATTEND' },
    { label: 'High', status: 'SPEAK' },
    { label: 'Medium', status: 'SPONSOR' },
    { label: 'Low', status: 'EXHIBIT' },
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
    },
    {
      label: 'In Discussion',
      status: 'IN_DISCUSSION',
    },
    {
      label: 'Shortlisted',
      status: 'SHORTLISTED',
    },
    {
      label: 'In Negotiation',
      status: 'IN_NEGOTIATION',
    },
    {
      label: 'Confirmed',
      status: 'CONFIRMED',
    },
    {
      label: 'Cancelled',
      status: 'CANCELLED',
    },
    {
      label: 'Rejected',
      status: 'REJECTED',
    },
  ],
  filter: {},
};
