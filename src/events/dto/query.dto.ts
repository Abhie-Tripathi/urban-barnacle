import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { SortByOptions, Regions, timezones } from 'src/utils';
import { EventStatus, EventTypeGroup, VisitorRangeTag } from 'src/utils/types';
import { LimitSchema } from 'src/global_dto';

const scoreRange = {
  lte: 100,
  gte: 0,
};
const refineScore = {
  scoreCheck: (score: string) =>
    !(+score < scoreRange.gte || +score > scoreRange.lte),
  message: {
    message: `score should be between ${scoreRange.gte} and ${scoreRange.lte}`,
  },
};

const Range = {
  gte: 0,
};
const refineRange = {
  rangeCheck: (range: string) => !(+range < Range.gte),
  message: {
    message: `range should be greater than ${Range.gte}`,
  },
};

const geoCoordinatesSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  radius: z.number().positive(),
});

export enum View {
  'list' = 'list',
  'map' = 'map',
  'calendar' = 'calendar',
  'tracker' = 'tracker',
  'detail' = 'detail',
}

export enum CalendarViewType {
  'year' = 'year',
  'month' = 'month',
  'week' = 'week',
}

export enum BoundType {
  'point' = 'point',
  'box' = 'box',
}

export enum Maturity {
  new,
  growing,
  established,
  flagship,
}

export enum Rating {
  '0-1',
  '1-2',
  '2-3',
  '3-4',
  '4-5',
}

export enum Show {
  branded,
  series,
  forecasted,
  rating,
  estimatedExhibitors,
  trustScore,
  entryType,
  audienceSpread,
  audienceZone,
  economicImpact,
  rankings,
  scores,
  maturity,
  frequency,
  alerts,
  isNew,
  old,
}

export enum Frequency {
  annual,
  'bi-annual',
  biennial,
  monthly,
  'one-time',
  quadrennial,
  quarterly,
  quinquennial,
  triennial,
  weekly,
}

export enum EventFormat {
  online,
  hybrid,
  offline,
}

export enum EntryType {
  free,
  paid,
  free_and_paid,
}

export enum AudienceZone {
  local,
  national,
  regional,
  global,
}

export const viewBound = z
  .object({
    boundType: z.nativeEnum(BoundType),
    coordinates: geoCoordinatesSchema,
    properties: z.record(z.string(), z.string()).optional(),
  })
  .transform((data) => {
    if (!data) return undefined;
    if (data.boundType === 'point') {
      return {
        boundType: data.boundType,
        // coordinates: geoCoordinatesSchema.parse(JSON.parse(data.coordinates)),
        coordinates: data.coordinates,
        properties: data.properties,
      };
    } else if (data.boundType === 'box') {
      return {
        boundType: data.boundType,
        // coordinates: JSON.parse(data.coordinates),
        coordinates: data.coordinates,
        properties: data.properties,
      };
    }
  });

export const QueryFilter = z.object({
  eventIds: z
    .string()
    .transform((data) => {
      return data?.split(',').map((item) => item.trim());
    })
    .optional(),
  query: z
    .string()
    .transform((data) => {
      if (!data) return undefined;

      return data;
    })
    .optional(),
  locationIds: z
    .string()
    .transform((data) => {
      if (!data) return [];
      return data?.split(',').map((item) => item.trim());
    })
    .optional(),
  geoCoordinates: z
    .string()
    // .refine(
    //   (data) => {
    //     try {
    //       if (!data) return true;
    //       const parsedData = JSON.parse(data);
    //       geoCoordinatesSchema.parse(parsedData);
    //       return true;
    //     } catch (e) {
    //       return false;
    //     }
    //   },
    //   { message: 'Invalid geoCoordinates' },
    // )
    .transform((data) => {
      return data ? geoCoordinatesSchema.parse(JSON.parse(data)) : undefined;
    })
    .optional(),
  viewBound: z
    .string()
    .transform((data) => {
      return data ? viewBound.parse(JSON.parse(data)) : undefined;
    })
    .optional(),
  eventTypes: z
    .string()
    .transform((data) => {
      if (!data) return [];
      return data?.split(',').map((item) => item.trim());
    })
    .optional(),
  categories: z
    .string()
    .transform((data) => {
      if (!data) return [];
      return data?.split(',').map((item) => item.trim());
    })
    .optional(),
  designations: z
    .string()
    .transform((data) => {
      if (!data) return [];
      return data?.split(',').map((item) => item.trim());
    })
    .optional(),
  tags: z
    .string()
    .transform((data) => {
      if (!data) return [];
      return data?.split(',').map((item) => item.trim());
    })
    .optional(),
  active_gte: z.string().datetime().optional(),
  // .default(new Date().toISOString()),

  active_lte: z.string().datetime().optional(),
  // .default(
  // new Date(
  //   new Date().getTime() + (90 - 1) * 24 * 60 * 60 * 1000,
  // ).toISOString(),
  // ),

  impact_score_lte: z
    .string()
    // .default(scoreRange.lte.toString())
    .refine(refineScore.scoreCheck, refineScore.message)
    .transform(Number)
    .optional(),
  impact_score_gte: z
    .string()
    // .default(scoreRange.gte.toString())
    .refine(refineScore.scoreCheck, refineScore.message)
    .transform(Number)
    .optional(),
  inbound_score_lte: z
    .string()
    // .default(scoreRange.lte.toString())
    .refine(refineScore.scoreCheck, refineScore.message)
    .transform(Number)
    .optional(),
  inbound_score_gte: z
    .string()
    // .default(scoreRange.gte.toString())
    .refine(refineScore.scoreCheck, refineScore.message)
    .transform(Number)
    .optional(),
  international_score_lte: z
    .string()
    // .default(scoreRange.lte.toString())
    .refine(refineScore.scoreCheck, refineScore.message)
    .transform(Number)
    .optional(),
  international_score_gte: z
    .string()
    // .default(scoreRange.gte.toString())
    .refine(refineScore.scoreCheck, refineScore.message)
    .transform(Number)
    .optional(),
  estimated_visitors_lte: z
    .string()
    // .default(Range.lte.toString())
    .refine(refineRange.rangeCheck, refineRange.message)
    .transform(Number)
    .optional(),
  estimated_visitors_gte: z
    .string()
    // .default(Range.gte.toString())
    .refine(refineRange.rangeCheck, refineRange.message)
    .transform(Number)
    .optional(),
  estimated_exhibitors_lte: z
    .string()
    .refine(refineRange.rangeCheck, {
      message: refineRange.message.message,
      path: ['estimated_exhibitors_lte'],
    })
    .transform(Number)
    .optional(),
  estimated_exhibitors_gte: z
    .string()
    .refine(refineRange.rangeCheck, {
      message: refineRange.message.message,
      path: ['estimated_exhibitors_gte'],
    })
    .transform(Number)
    .optional(),
  status: z
    .string()
    // .default('ACTIVE,CANCELLED,POSTPONED,PREDICTED,UNVERIFIED')
    .refine(
      (data) => {
        const status = data?.split(',').map((item) => item.trim());
        return status!.every((item) =>
          Object.values(EventStatus).includes(
            item.toUpperCase() as unknown as EventStatus,
          ),
        );
      },
      {
        message: 'Invalid status',
        path: ['status'],
        params: {
          validOptions: Object.values(EventStatus)
            .map((val) => val.toLowerCase())
            .join(', '),
        },
      },
    )
    .transform((data) => {
      return data
        .split(',')
        .map((item) => item.trim().toUpperCase()) as unknown as EventStatus[];
    })
    .optional(),
  maturity: z
    .string()
    .refine((val) => val.split(',').every((item) => item in Maturity))
    .transform((val) => val.split(','))
    .optional(),
  onlyBranded: z
    .string()
    .refine((val) => ['true', 'false'].includes(val))
    .transform((val) => Boolean(val))
    .optional(),
  onlySeries: z
    .string()
    .refine((val) => ['true', 'false'].includes(val))
    .transform((val) => Boolean(val))
    .optional(),
  show: z
    .string()
    .refine((val) => val.split(',').every((item) => item in Show))
    .transform((val) => val.split(','))
    .optional(),
  ratings: z
    .string()
    .refine((val) => val.split(',').every((item) => item in Rating))
    .transform((val) => val.split(','))
    .optional(),
  frequencies: z
    .string()
    .refine((val) => val.split(',').every((item) => item in Frequency))
    .transform((val) => val.split(','))
    .optional(),
  trust_score_lte: z
    .string()
    .refine(refineScore.scoreCheck, {
      message: refineScore.message.message,
      path: ['trust_score_lte'],
    })
    .transform(Number)
    .optional(),
  trust_score_gte: z
    .string()
    .refine(refineScore.scoreCheck, {
      message: refineScore.message.message,
      path: ['trust_score_gte'],
    })
    .transform(Number)
    .optional(),
  eventFormats: z
    .string()
    .refine((val) => val.split(',').every((item) => item in EventFormat))
    .transform((val) => val.split(','))
    .optional(),
  entryType: z
    .string()
    .refine((val) => val.split(',').every((item) => item in EntryType))
    .transform((val) => val.split(','))
    .optional(),
  editions_lte: z
    .string()
    .refine(refineRange.rangeCheck, {
      message: refineRange.message.message,
      path: ['editions_lte'],
    })
    .transform(Number)
    .optional(),
  editions_gte: z
    .string()
    .refine(refineRange.rangeCheck, {
      message: refineRange.message.message,
      path: ['editions_gte'],
    })
    .transform(Number)
    .optional(),
  category_rank_lte: z
    .string()
    .refine(refineRange.rangeCheck, {
      message: refineRange.message.message,
      path: ['category_rank_lte'],
    })
    .transform(Number)
    .optional(),
  category_rank_gte: z
    .string()
    .refine(refineRange.rangeCheck, {
      message: refineRange.message.message,
      path: ['category_rank_gte'],
    })
    .transform(Number)
    .optional(),
  country_rank_lte: z
    .string()
    .refine(refineRange.rangeCheck, {
      message: refineRange.message.message,
      path: ['country_rank_lte'],
    })
    .transform(Number)
    .optional(),
  country_rank_gte: z
    .string()
    .refine(refineRange.rangeCheck, {
      message: refineRange.message.message,
      path: ['country_rank_gte'],
    })
    .transform(Number)
    .optional(),
  category_country_rank_lte: z
    .string()
    .refine(refineRange.rangeCheck, {
      message: refineRange.message.message,
      path: ['category_country_rank_lte'],
    })
    .transform(Number)
    .optional(),
  category_country_rank_gte: z
    .string()
    .refine(refineRange.rangeCheck, {
      message: refineRange.message.message,
      path: ['category_country_rank_gte'],
    })
    .transform(Number)
    .optional(),
  audienceSpread: z
    .string()
    .refine((val) => val.split(','))
    .transform((val) => val.split(','))
    .optional(),
  audienceSpreadRegions: z
    .string()
    .refine((val) =>
      val
        .split(',')
        .every((item) => (item.trim() as keyof typeof Regions) in Regions),
    )
    .transform((val) => val.split(',').map((item) => item.trim()))
    .optional(),
  audienceZone: z
    .string()
    .refine((val) => val.split(',').every((item) => item in AudienceZone))
    .transform((val) => val.split(','))
    .optional(),
  estimatedVisitors: z
    .string()
    .refine((val) => val.split(','))
    .transform((val) => val.split(','))
    .optional(),
  estimatedExhibitors: z
    .string()
    .refine((val) => val.split(','))
    .transform((val) => val.split(','))
    .optional(),
  economic_impact_lte: z
    .string()
    .refine(refineRange.rangeCheck, {
      message: refineRange.message.message,
      path: ['economic_impact_lte'],
    })
    .transform(Number)
    .optional(),
  economic_impact_gte: z
    .string()
    .refine(refineRange.rangeCheck, {
      message: refineRange.message.message,
      path: ['economic_impact_gte'],
    })
    .transform(Number)
    .optional(),
  top: z.string().transform(Number).optional(),
  includeKeywords: z
    .string()
    .transform((val) => val.split(','))
    .optional(),
  excludeKeywords: z
    .string()
    .transform((val) => val.split(','))
    .optional(),
  regions: z
    .string()
    .refine(
      (val) =>
        val.split(',').every((item) => Regions[item as keyof typeof Regions]),
      { params: { validOptions: Object.keys(Regions).join(', ') } },
    )
    .transform((val) => val.split(','))
    .optional(),
  eventTypeGroup: z
    .string()
    .refine((val) => val in EventTypeGroup, {
      message: 'Invalid eventTypeGroup',
      params: { validOptions: Object.keys(EventTypeGroup).join(', ') },
    })
    .optional(),
  createdAt: z.string().datetime().optional(),
  estimatedVisitorRangeTag: z
    .string()
    .refine((val) =>
      val.split(',').every((item) => item.toUpperCase() in VisitorRangeTag),
    )
    .transform((val) => val.split(',').map((item) => item.toUpperCase()))
    .optional(),
});

export const FilterNames = Object.keys(QueryFilter.shape);

export const QuerySchema = LimitSchema.extend(QueryFilter.shape)
  .extend({
    sortBy: z
      .string()
      .refine((val) => val.split(',').every((item) => item in SortByOptions), {
        message: 'Invalid sortBy option',
        params: { validOptions: Object.keys(SortByOptions).join(', ') },
      })
      .transform((val) => val.split(','))
      .optional(),
    localTimezone: z
      .nativeEnum(timezones)
      .default(timezones['Asia/Kolkata'])
      .optional(),
    view: z.nativeEnum(View).optional().default(View.list),
    calendar_type: z.nativeEnum(CalendarViewType).optional(),
  })
  .transform((data) => {
    // const intersectedKeys = Object.keys(data).filter((key) =>
    //   FilterNames.includes(key),
    // );
    // if (
    //   !(
    //     intersectedKeys.length === 1 && intersectedKeys[0].trim() === 'query'
    //   ) &&
    //   !(data.eventIds && data.eventIds.length)
    // ) {
    //   const defaultStartDate = new Date().toISOString();
    //   const defaultEndDate = new Date(
    //     new Date().getTime() + (90 - 1) * 24 * 60 * 60 * 1000,
    //   ).toISOString();
    //   if (!data['active_gte'] && !data['active_lte']) {
    //     data['active_gte'] = defaultStartDate;
    //     data['active_lte'] = defaultEndDate;
    //   } else if (!data['active_lte'] && data['active_gte']) {
    //     data['active_gte'] = data['active_gte'];
    //   } else if (!data['active_gte'] && data['active_lte']) {
    //     data['active_lte'] = data['active_lte'];
    //   }
    // }
    return data;
  });

export class QueryDto extends createZodDto(QuerySchema) { }

export enum CountGroup {
  'year' = 'year',
  'month' = 'month',
  'week' = 'week',
  'day' = 'day',
  'country' = 'country',
  'state' = 'state',
  'city' = 'city',
  'status' = 'status',
  'alertType' = 'alertType',
  'eventTypeGroup' = 'eventTypeGroup',
}

export const CountQuerySchema = QueryFilter.extend({
  groupBy: z
    .string()
    .refine((val) => val.split(',').every((item) => item in CountGroup), {
      message: 'Invalid groupBy option',
      params: { validOptions: Object.keys(CountGroup).join(', ') },
    })
    .transform((val) => val.split(',') as CountGroup[])
    .optional(),
}).transform((data) => {
  // const intersectedKeys = Object.keys(data).filter((key) =>
  //   FilterNames.includes(key),
  // );
  // if (
  //   !(intersectedKeys.length === 1 && intersectedKeys[0].trim() === 'query') &&
  //   !(data.eventIds && data.eventIds.length)
  // ) {
  //   const defaultStartDate = new Date().toISOString();
  //   const defaultEndDate = new Date(
  //     new Date().getTime() + (90 - 1) * 24 * 60 * 60 * 1000,
  //   ).toISOString();
  //   if (!data['active_gte'] && !data['active_lte']) {
  //     data['active_gte'] = defaultStartDate;
  //     data['active_lte'] = defaultEndDate;
  //   } else if (!data['active_lte'] && data['active_gte']) {
  //     data['active_gte'] = data['active_gte'];
  //   } else if (!data['active_gte'] && data['active_lte']) {
  //     data['active_lte'] = data['active_lte'];
  //   }
  // }
  return data;
});

export class CountQueryDto extends createZodDto(CountQuerySchema) { }

const groupByOptions = {
  date: 'date',
};

const dateViewOptions = {
  year: 'year',
  month: 'month',
  week: 'week',
  day: 'day',
};

const columns = {
  impactScore: 'impactScore',
  predictedAttendance: 'predictedAttendance',
  economicImpact: 'economicImpact',
  eventCount: 'eventCount',
  inboundEstimate: 'inboundEstimate',
  internationalEstimate: 'internationalEstimate',
};

export const EventsTrendsSchema = QueryFilter.extend({
  groupBy: z.string().refine((val) => val in groupByOptions, {
    message: 'Invalid groupBy option',
    params: { validOptions: Object.keys(groupByOptions).join(', ') },
  }),
  columns: z
    .string()
    .refine((val) => val.split(',').every((item) => item in columns), {
      message: 'Invalid columns option',
      params: { validOptions: Object.keys(columns).join(', ') },
    })
    .transform((val) => val.split(',')),
  dateView: z.string().refine((val) => val in dateViewOptions, {
    message: 'Invalid dateView option',
    params: { validOptions: Object.keys(dateViewOptions).join(', ') },
  }),
});

export class EventsTrendsDto extends createZodDto(EventsTrendsSchema) { }

const sortSchema = z.strictObject({
  sortBy: z.string().optional()
})

export class SortingDto extends createZodDto(sortSchema) { }