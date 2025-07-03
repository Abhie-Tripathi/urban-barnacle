import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { SortByOptions, Regions, timezones } from 'src/utils';
import {
  defaultEventTypes,
  EventStatus,
  EventTypeGroup,
  ValidEventTypes,
  VisitorRangeTag,
} from 'src/utils/types';
import { LimitSchema, LimitSchemaWithoutDefault } from 'src/global_dto';

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
  'suggestion' = 'suggestion',
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
  branded = 'branded',
  series = 'series',
  forecasted = 'forecasted',
  rating = 'rating',
  estimatedExhibitors = 'estimatedExhibitors',
  trustScore = 'trustScore',
  audienceSpread = 'audienceSpread',
  audienceZone = 'audienceZone',
  economicImpact = 'economicImpact',
  rankings = 'rankings',
  scores = 'scores',
  maturity = 'maturity',
  frequency = 'frequency',
  alerts = 'alerts',
  isNew = 'isNew',
  old = 'old',
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
  in_person,
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
    coordinates: z.union([geoCoordinatesSchema, z.array(z.number())]),
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
    .union([z.string(), viewBound])
    .transform((data) => {
      if (!data) return undefined;
      if (typeof data === 'string') {
        return viewBound.parse(JSON.parse(data));
      } else {
        return viewBound.parse(data);
      }
    })
    .optional(),
  eventTypes: z
    .string()
    .transform((data) => {
      if (!data) return [];
      return data?.split(',').map((item) => item.trim());
    })
    .superRefine((values, ctx) => {
      if (values.length === 0) return;

      const backend = process.env.BACKEND as keyof typeof ValidEventTypes;

      if (!backend || !(backend in ValidEventTypes)) {
        return;
      }

      const allowedEventTypes = ValidEventTypes[backend];

      const invalidTypes = values.filter(
        (value) => !allowedEventTypes.includes(value),
      );

      if (invalidTypes.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid event types : ${invalidTypes.join(', ')}. Allowed types are: ${allowedEventTypes.join(', ')}`,
          path: [],
        });
      }
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
  active_gte: z
    .string()
    .refine(
      (date) =>
        date &&
        new Date(date).toISOString().split('T')[0] === date.split('T')[0],
    )
    .transform((date) => new Date(date).toISOString().split('T')[0])
    .optional(),
  // .default(new Date().toISOString()),

  active_lte: z
    .string()
    .refine(
      (date) =>
        date &&
        new Date(date).toISOString().split('T')[0] === date.split('T')[0],
    )
    .transform((date) => new Date(date).toISOString().split('T')[0])
    .optional(),
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
        .map((item) => item.trim().toLowerCase()) as unknown as EventStatus[];
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
    .transform((val) =>
      val.split(',').map((item) => item.trim() as unknown as Show),
    )
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
    .transform((val) =>
      val
        .split(',')
        .map((item) => (item.trim() === 'offline' ? 'in_person' : item.trim())),
    )
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
  createdAt: z
    .string()
    .refine(
      (date) =>
        date &&
        new Date(date).toISOString().split('T')[0] === date.split('T')[0],
    )
    .transform((date) => new Date(date).toISOString().split('T')[0])
    .optional(),
  estimatedVisitorRangeTag: z
    .string()
    .refine((val) =>
      val.split(',').every((item) => item.toUpperCase() in VisitorRangeTag),
    )
    .transform((val) => val.split(',').map((item) => item.toUpperCase()))
    .optional(),
  countries: z
    .string()
    .transform((data) => {
      if (!data) return [];
      return data?.split(',').map((item) => item.trim());
    })
    .optional(),
});

export const FilterNames = Object.keys(QueryFilter.shape);

export class QueryFilterDto extends createZodDto(QueryFilter) { }

export const QueryHttpSchema = LimitSchemaWithoutDefault.extend(
  QueryFilter.shape,
)
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
    trackerId: z.string().optional(),
    save: z
      .string()
      .refine((val) => ['true', 'false'].includes(val), {
        message: 'Invalid save option',
        params: { validOptions: ['true', 'false'].join(', ') },
      })
      .transform((val) => (val === 'true' ? true : false))
      .optional(),

    requestSource: z
      .string()
      .refine((val) => ['research', 'trends'].includes(val), {
        message: 'Invalid request source',
        params: { validOptions: ['research', 'trends'].join(', ') },
      })
      .optional(),
  })
  .transform((data) => {
    data['show'] = (Object.values(Show) as Show[]).filter((item) => {
      return item !== Show.isNew && item !== Show.old;
    });
    if (data.view !== 'map' && !data.limit) {
      data.limit = 10;
    }
    if (!data.sortBy || data.sortBy.length === 0) {
      data.sortBy = ['-score'];
    }

    if (!data.status || (data.status && data.status.length === 0)) {
      data.status = [
        EventStatus.ACTIVE,
        EventStatus.CANCELLED,
        EventStatus.POSTPONED,
      ];
    }
    return data;
  });

export class QueryHttpDto extends createZodDto(
  QueryHttpSchema.refine(
    (val) => {
      console.log({ val });
      if (
        (val && !val.limit) ||
        (val && val.limit && val.limit <= 100) ||
        val.view === 'map'
      ) {
        return true;
      }
      return false;
    },
    {
      message: 'Limit must be a number less than or equal to 100',
      path: ['limit'],
    },
  ),
) { }

export const QuerySchema = QueryHttpSchema.innerType().extend({
  showValues: z.string(),
  viewBounds: z.string().optional(),
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
  'category' = 'category'
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
  trackerId: z.string().optional(),
  eventSourceIds: z.string().optional(),
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
  // if (!data.eventTypes || (data.eventTypes && data.eventTypes.length === 0)) {
  //   const backend = process.env.BACKEND;
  //   if (backend && backend in defaultEventTypes) {
  //     data.eventTypes = defaultEventTypes[backend];
  //   }
  // }

  if (!data.status || (data.status && data.status.length === 0)) {
    data.status = [
      EventStatus.ACTIVE,
      EventStatus.CANCELLED,
      EventStatus.POSTPONED,
    ];
  }
  return data;
});

export class CountQueryDto extends createZodDto(CountQuerySchema) {  }
const similarEventsSchema = QuerySchema.omit({ showValues: true })
  .extend({
    showValues: z.string().default('basic,advance,insights,audience'),
    groupBy: z
      .string()
      .refine((val) => val.split(',').every((item) => item in CountGroup), {
        message: 'Invalid groupBy option',
        params: { validOptions: Object.keys(CountGroup).join(', ') },
      })
      .transform((val) => val.split(',') as CountGroup[])
      .optional(),
    searchByEntity: z.string().optional(),
    eventSourceIds: z.string().optional(),
  })
  .transform((data) => {
    if (!data.status || (data.status && data.status.length === 0)) {
      data.status = [
        EventStatus.ACTIVE,
        EventStatus.CANCELLED,
        EventStatus.POSTPONED,
      ];
    }
    return data;
  });
export class SimilarEventsDto extends createZodDto(similarEventsSchema) { }

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
  source: z
    .string()
    .refine((val) => val in ['geo', 'gtm'])
    .optional(),
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
  compare_to: z.string().refine(
    (date) =>
      date &&
      new Date(date).toISOString().split('T')[0] === date.split('T')[0],
  )
    .transform((date) => new Date(date).toISOString().split('T')[0]).optional(),
  compare_from: z.string().refine(
    (date) =>
      date &&
      new Date(date).toISOString().split('T')[0] === date.split('T')[0],
  )
    .transform((date) => new Date(date).toISOString().split('T')[0]).optional(),
})

export class EventsTrendsDto extends createZodDto(EventsTrendsSchema) { }

const sortSchema = LimitSchemaWithoutDefault.extend({
  sortBy: z.string().optional(),
});

export class SortingDto extends createZodDto(sortSchema) { }
