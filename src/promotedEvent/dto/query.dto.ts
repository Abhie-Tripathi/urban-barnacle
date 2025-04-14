import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { Prisma } from '@prisma/client';

// export const QuerySchema = z.object({
//   title: z
//     .string()
//     .optional()
//     .transform((data) => {
//       return {
//         contains: data,
//         mode: 'insensitive' as Prisma.QueryMode,
//       };
//     }),
//   startingDateTime: z
//     .string()
//     .datetime()
//     .optional()
//     .transform((data) => {
//       return {
//         gte: data,
//       };
//     }),
//   endingDateTime: z
//     .string()
//     .datetime()
//     .optional()
//     .transform((data) => {
//       return {
//         lte: data,
//       };
//     }),
//   city: z
//     .string()
//     .optional()
//     .transform((data) => {
//       return data?.split(',').map((item) => item.trim());
//     }),
//   category: z
//     .string()
//     .optional()
//     .transform((data) => ({
//       some: {
//         slug: {
//           in: data?.split(',').map((item) => item.trim()),
//         },
//       },
//     })),
//   take: z
//     .string()
//     .optional()
//     .default('20')
//     .transform((data) => parseInt(data, 10)),
//   offset: z
//     .string()
//     .optional()
//     .default('0')
//     .transform((data) => parseInt(data, 10)),
// });

// export class QueryDto extends createZodDto(QuerySchema) {}

const eventIdParamSchema = z.object({
  id: z.string(),
});

export class EventIdParamDto extends createZodDto(eventIdParamSchema) { }

const AllDataSchema = z.strictObject({
  limit: z
    .string()
    .optional()
    .transform((value) => {
      if (value !== undefined) {
        return parseInt(value, 10);
      }
      return 10;
    }),
  offset: z
    .string()
    .optional()
    .transform((value) => {
      if (value !== undefined) {
        return parseInt(value, 10);
      }
      return 0;
    }),
  id: z.string().optional(),
  name: z.string().optional(),
  widgetId: z.string().optional(),
  sortBy: z.string().optional(),
  sortType: z.string().optional(),
  event_type: z.string().optional(),
  participationType: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  upcoming: z.string().optional(),
  expired: z.string().optional(),
  views: z.string().optional(),
  calendarType: z
    .string()
    .optional()
    .transform((value) => {
      if (value === 'month') return value;
      if (value === 'year') return value;
      return value;
    }),
});
export class Query_Dto extends createZodDto(AllDataSchema) { }

const subEvent = z.strictObject({
  widgetId: z.string(),
  eventId: z.string(),
  limit: z
    .string()
    .optional()
    .transform((value) => {
      if (value !== undefined) {
        return parseInt(value, 10);
      }
      return 10;
    }),
  offset: z
    .string()
    .optional()
    .transform((value) => {
      if (value !== undefined) {
        return parseInt(value, 10);
      }
      return 0;
    }),
});

export class SubEvent_DTO extends createZodDto(subEvent) { }

const pocEvent = z.strictObject({
  pocId: z.string(),
  eventId: z.string(),
  unlockValue: z.string().transform((val) => val.toUpperCase().split(',')),
});

export class Poc_DTO extends createZodDto(pocEvent) { }

const eventDuplicateSchema = z.strictObject({
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  locationIds: z.string(),
  startDate: z.string().optional(),
  excludeEventIds: z.string().optional().transform(val => val ? val.replaceAll(',', "','") : val),
  endDate: z.string().optional(),
  venueId: z.string().optional(),
  countryId: z.string().optional(),
});

export class EventDuplicate_DTO extends createZodDto(eventDuplicateSchema) { }

