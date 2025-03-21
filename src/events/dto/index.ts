export * from './query.dto';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { UnlockValue } from '@prisma/client';

const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  locationType: z.string(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

const StateSchema = LocationSchema.extend({
  countryId: z.string(),
});

const CitySchema = LocationSchema.extend({
  stateId: z.string(),
  countryId: z.string(),
});

const CountrySchema = LocationSchema.extend({
  regions: z.array(z.string()),
});

const VenueSchema = LocationSchema.extend({
  cityId: z.string(),
  stateId: z.string(),
  countryId: z.string(),
  address: z.string(),
  displayName: z.string(),
});

const EventDataSchema = z.object({
  id: z.string(),
  startDateTime: z.string(),
  endDateTime: z.string(),
  status: z.string(),
  format: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  description: z.string(),
  logoUrl: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  editions: z.number(),
  matchedKeywordsPercentage: z.number().optional(),
  matchedKeywords: z.array(z.string()).optional(),
  '10timesEventPageUrl': z.string(),
  type: z.string().optional(),
  level: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  lastModified: z.string().optional(),
  originLatitude: z.string().optional(),
  originLongitude: z.string().optional(),
  sponsorsCount: z.number().optional(),
  speakersCount: z.number().optional(),
  exhibitorsCount: z.number().optional(),
  timings: z.string().nullable(),
  lastVerifiedOn: z.string().nullable(),
  estimatedVisitorRangeTag: z.string().nullable(),
  economicImpactBreakdown: z.record(z.string(), z.number()),
  isBranded: z.boolean(),
  eventPageUrl: z.string(),
  isSeries: z.boolean(),
  rehostDate: z.string(),
  rating: z.number(),
  estimatedExhibitors: z.string(),
  trustScore: z.number(),
  entryType: z.string().nullable(),
  reputationChangePercentage: z.number().nullable(),
  trustChangePercentage: z.number().nullable(),
  trustChangeTag: z.string().nullable(),
  reputationChangeTag: z.string().nullable(),
  audienceSpread: z.record(
    z.string(),
    z.object({
      iso: z.string(),
      name: z.string(),
      count: z.number(),
      percentage: z.number(),
    }),
  ),
  designationSpread: z.array(
    z.object({
      count: z.string(),
      percentage: z.number(),
      designation: z.string(),
    }),
  ),
  audienceZone: z.string().nullable(),
  economicImpact: z.string(),
  alerts: z.array(z.any()),
  rankings: z.object({
    global: z.number(),
    country: z
      .object({
        countryId: z.string(),
        rank: z.number(),
      })
      .nullable(),
    categories: z.array(
      z.object({
        categoryId: z.string(),
        rank: z.number(),
      }),
    ),
    category_country: z.array(
      z.object({
        categoryId: z.string(),
        countryId: z.string(),
        rank: z.number(),
      }),
    ),
  }),
  scores: z.object({
    impactScore: z.number().nullable(),
    inboundScore: z.number().nullable(),
    internationalScore: z.number().nullable(),
    internationalScoreTag: z.string().nullable(),
  }),
  maturity: z.string().nullable(),
  frequency: z.string().nullable(),
  yoyGrowth: z.number().nullable(),
  name: z.string(),
  website: z.string(),
  repeatSentiment: z.number(),
  reputationScore: z.number(),
  rehostScore: z.number(),
  estimatedAttendanceMean: z.number().nullable(),
  estimatedAttendance: z.number().nullable(),
  primaryEventType: z.string(),
  trackerMatchInfo: z.any(),
  categories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
    }),
  ),
  designations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
    }),
  ),
  eventTypes: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      eventGroupType: z.string(),
    }),
  ),
  tags: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
    }),
  ),
  eventLocation: z.object({
    state: z.union([StateSchema, z.array(StateSchema)]).nullable(),
    city: z.union([CitySchema, z.array(CitySchema)]).nullable(),
    venue: VenueSchema.nullable(),
    country: CountrySchema.nullable(),
  }),
  organizer: z
    .object({
      id: z.string(),
      name: z.string(),
      website: z.string(),
      logoUrl: z.string().nullable(),
      totalExhibit: z.number(),
      totalSponsor: z.number(),
      totalVisitor: z.number(),
      totalOrganize: z.number(),
      location: z.object({
        address: z.string().nullable(),
        city: z
          .object({
            id: z.string(),
            name: z.string(),
            stateId: z.string(),
            countryId: z.string(),
            latitude: z.string(),
            longitude: z.string(),
            locationType: z.string(),
          })
          .nullable(),
        state: z
          .object({
            id: z.string(),
            name: z.string(),
            countryId: z.string(),
            latitude: z.string(),
            longitude: z.string(),
            locationType: z.string(),
          })
          .nullable(),
        country: z
          .object({
            id: z.string(),
            name: z.string(),
            latitude: z.string(),
            longitude: z.string(),
            regions: z.array(z.string()),
            locationType: z.string(),
          })
          .nullable(),
      }),
    })
    .nullable(),
  tickets: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        currency: z.string(),
        price: z.string(),
        ticketUrl: z.string().nullable(),
      }),
    )
    .nullable(),
});

export class EventDataDto extends createZodDto(EventDataSchema) {}

const pocsUnmaskSchema = z.strictObject({
  unlockValue: z
    .string()
    .transform((val) => val.toUpperCase().split(',') as UnlockValue[]),
});

export class PocsUnmaskDto extends createZodDto(pocsUnmaskSchema) {}
