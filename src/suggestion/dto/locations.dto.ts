import { z } from 'zod';
import { SuggestionSchema } from '.';
import { createZodDto } from 'nestjs-zod';

const LocationType = {
  CITY: 'city',
  STATE: 'state',
  COUNTRY: 'country',
  REGION: 'region',
  VENUE: 'venue',
} as const;

export const LocationSchema = SuggestionSchema.extend({
  type: z
    .string()
    .refine((type) => type in LocationType)
    .transform((type) => type.toUpperCase()),
});

export class LocationDto extends createZodDto(LocationSchema) {}

export const LocationResponseSchema = z.object({
  formattedLocations: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      displayName: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      iso: z.string().nullable(),
      locationType: z.string(),
      city: z
        .object({
          id: z.string().uuid(),
          name: z.string(),
          latitude: z.number(),
          longitude: z.number(),
        })
        .optional(),
      state: z
        .object({
          id: z.string().uuid(),
          name: z.string(),
          latitude: z.number(),
          longitude: z.number(),
        })
        .optional(),
      country: z
        .object({
          id: z.string().uuid(),
          name: z.string(),
          latitude: z.number(),
          longitude: z.number(),
          iso: z.string(),
        })
        .optional(),
    }),
  ),
});

export class LocationResponseDto extends createZodDto(LocationResponseSchema) {}
