import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { LocationType, GeomType, RadiusUnit } from '@prisma/client';
import { GeoJsonSchema } from 'src/utils/types';

// export const GeoJsonSchema = z.object({
//   geometry: z.object({
//     type: z
//       .string()
//       .transform((data) =>
//         data.toUpperCase() in GeomType ? data.toUpperCase() : null,
//       ),
//     coordinates: z.array(z.number()).length(2),
//   }),
//   properties: z.object({
//     radius: z.number().positive(),
//     radiusUnit: z
//       .string()
//       .transform((data) =>
//         data.toUpperCase() in RadiusUnit ? data.toUpperCase() : null,
//       ),
//   }),
// });

// export type GeoJson = z.infer<typeof GeoJsonSchema>;

const CreateSavedLocationSchema = z.array(
  z.object({
    locationType: z.nativeEnum(LocationType),
    geoJson: GeoJsonSchema.optional(),
    locationId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    locationName: z.string(),
    customName: z.string().optional(),
  }),
);

export class CreateSavedLocationDto extends createZodDto(
  CreateSavedLocationSchema,
) {}

const UpdateSavedLocationHttpSchema = z.object({
  radius: z.number().positive().optional(),
  radiusUnit: z.nativeEnum(RadiusUnit).optional(),
});

export class UpdateSavedLocationHttpDto extends createZodDto(
  UpdateSavedLocationHttpSchema,
) {}

const UpdateSavedLocationSchema = UpdateSavedLocationHttpSchema.extend({
  id: z.string().uuid(),
  area: z.number().optional(),
  deleted: z.boolean().optional(),
});

export class UpdateSavedLocationDto extends createZodDto(
  UpdateSavedLocationSchema,
) {}

// enum duration {
//   '30D' = '30D',
//   '60D' = '60D',
//   '90D' = '90D',
// }

// enum sortBy {
//   'modified' = 'modified',
//   'name' = 'name',
// }

// enum order {
//   'asc' = 'asc',
//   'desc' = 'desc',
// }

export const GetSavedLocationsHttpSchema = z.object({
  name: z.string().optional(),
  offset: z
    .string()
    .optional()
    .default('0')
    .transform((data) => parseInt(data, 10)),
  limit: z
    .string()
    .max(30)
    .optional()
    .default('10')
    .transform((data) => parseInt(data, 10)),
  //   duration: z.nativeEnum(duration).optional(),
  //   sortBy: z.nativeEnum(sortBy).optional().default(sortBy.modified),
  //   order: z.nativeEnum(order).optional().default(order.desc),
});

export class GetSavedLocationsHttpDto extends createZodDto(
  GetSavedLocationsHttpSchema,
) {}

const GetSavedLocationsSchema = GetSavedLocationsHttpSchema.extend({
  id: z.array(z.string().uuid()).optional(),
  userId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
});

export class GetSavedLocationsDto extends createZodDto(
  GetSavedLocationsSchema,
) {}
