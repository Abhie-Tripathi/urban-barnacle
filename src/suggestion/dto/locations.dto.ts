import { z } from 'zod';
import { SuggestionSchema } from 'src/utils';
import { createZodDto } from 'nestjs-zod';

export const LocationType = {
  CITY: 'city',
  STATE: 'state',
  COUNTRY: 'country',
  REGION: 'region',
  VENUE: 'venue',
} as const;

export const LocationSchema = SuggestionSchema.extend({
  type: z
    .string()
    .refine((type) => Object.keys(LocationType).includes(type.toUpperCase()))
    .transform((type) => type.toUpperCase())
    .optional(),
});

export class LocationDto extends createZodDto(LocationSchema) {}

export const LocationResponseSchema = z.object({
  formattedLocations: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      displayName: z.string(),
      latitude: z.coerce.number().optional(),
      longitude: z.coerce.number().optional(),
      iso: z.string().optional(),
      locationType: z.string(),
      city: z
        .object({
          id: z.string().uuid(),
          name: z.string(),
          latitude: z.coerce.number().optional(),
          longitude: z.coerce.number().optional(),
        })
        .nullable()
        .optional(),
      state: z
        .object({
          id: z.string().uuid(),
          name: z.string(),
          latitude: z.coerce.number().optional(),
          longitude: z.coerce.number().optional(),
        })
        .nullable()
        .optional(),
      country: z
        .object({
          id: z.string().uuid(),
          name: z.string(),
          latitude: z.coerce.number().optional(),
          longitude: z.coerce.number().optional(),
          iso: z.string().optional(),
        })
        .nullable()
        .optional(),
    }),
  ),
});

export class LocationResponseDto extends createZodDto(LocationResponseSchema) {}
