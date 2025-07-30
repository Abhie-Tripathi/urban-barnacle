import { createZodDto } from "nestjs-zod";
import { jobCompositeSchema, Show, View } from "src/events/dto";
import { LimitDto, LimitSchema } from "src/global_dto";
import { SearchByEntity, TrackerEventStatus } from "src/utils";
import { VisitorRangeTag } from "src/utils/types";
import { z } from "zod";

const QueryFilter = LimitSchema.extend({
    //   eventIds: z
    //     .string()
    //     .transform((data) => {
    //       return data?.split(',').map((item) => item.trim());
    //     })
    //     .optional(),
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
    //   geoCoordinates: z
    //     .string()
    //     // .refine(
    //     //   (data) => {
    //     //     try {
    //     //       if (!data) return true;
    //     //       const parsedData = JSON.parse(data);
    //     //       geoCoordinatesSchema.parse(parsedData);
    //     //       return true;
    //     //     } catch (e) {
    //     //       return false;
    //     //     }
    //     //   },
    //     //   { message: 'Invalid geoCoordinates' },
    //     // )
    //     .transform((data) => {
    //       return data ? geoCoordinatesSchema.parse(JSON.parse(data)) : undefined;
    //     })
    //     .optional(),
    //   viewBound: z
    //     .union([z.string(), viewBound])
    //     .transform((data) => {
    //       if (!data) return undefined;
    //       if (typeof data === 'string') {
    //         return viewBound.parse(JSON.parse(data));
    //       } else {
    //         return viewBound.parse(data);
    //       }
    //     })
    //     .optional(),
    //   eventTypes: z
    //     .string()
    //     .transform((data) => {
    //       if (!data) return [];
    //       return data?.split(',').map((item) => item.trim());
    //     })
    //     .superRefine((values, ctx) => {
    //       if (values.length === 0) return;

    //       const backend = process.env.BACKEND as keyof typeof ValidEventTypes;

    //       if (!backend || !(backend in ValidEventTypes)) {
    //         return;
    //       }

    //       const allowedEventTypes = ValidEventTypes[backend];

    //       const invalidTypes = values.filter(
    //         (value) => !allowedEventTypes.includes(value),
    //       );

    //       if (invalidTypes.length > 0) {
    //         ctx.addIssue({
    //           code: z.ZodIssueCode.custom,
    //           message: `Invalid event types : ${invalidTypes.join(', ')}. Allowed types are: ${allowedEventTypes.join(', ')}`,
    //           path: [],
    //         });
    //       }
    //     })
    //     .optional(),
    categories: z
        .string()
        .transform((data) => {
            if (!data) return [];
            return data?.split(',').map((item) => item.trim());
        })
        .optional(),
    //   designations: z
    //     .string()
    //     .transform((data) => {
    //       if (!data) return [];
    //       return data?.split(',').map((item) => item.trim());
    //     })
    //     .optional(),
    //   tags: z
    //     .string()
    //     .transform((data) => {
    //       if (!data) return [];
    //       return data?.split(',').map((item) => item.trim());
    //     })
    //     .optional(),
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

    //   impact_score_lte: z
    //     .string()
    //     // .default(scoreRange.lte.toString())
    //     .refine(refineScore.scoreCheck, refineScore.message)
    //     .transform(Number)
    //     .optional(),
    //   impact_score_gte: z
    //     .string()
    //     // .default(scoreRange.gte.toString())
    //     .refine(refineScore.scoreCheck, refineScore.message)
    //     .transform(Number)
    //     .optional(),
    //   inbound_score_lte: z
    //     .string()
    //     // .default(scoreRange.lte.toString())
    //     .refine(refineScore.scoreCheck, refineScore.message)
    //     .transform(Number)
    //     .optional(),
    //   inbound_score_gte: z
    //     .string()
    //     // .default(scoreRange.gte.toString())
    //     .refine(refineScore.scoreCheck, refineScore.message)
    //     .transform(Number)
    //     .optional(),
    //   international_score_lte: z
    //     .string()
    //     // .default(scoreRange.lte.toString())
    //     .refine(refineScore.scoreCheck, refineScore.message)
    //     .transform(Number)
    //     .optional(),
    //   international_score_gte: z
    //     .string()
    //     // .default(scoreRange.gte.toString())
    //     .refine(refineScore.scoreCheck, refineScore.message)
    //     .transform(Number)
    //     .optional(),
    //   estimated_visitors_lte: z
    //     .string()
    //     // .default(Range.lte.toString())
    //     .refine(refineRange.rangeCheck, refineRange.message)
    //     .transform(Number)
    //     .optional(),
    //   estimated_visitors_gte: z
    //     .string()
    //     // .default(Range.gte.toString())
    //     .refine(refineRange.rangeCheck, refineRange.message)
    //     .transform(Number)
    //     .optional(),
    //   estimated_exhibitors_lte: z
    //     .string()
    //     .refine(refineRange.rangeCheck, {
    //       message: refineRange.message.message,
    //       path: ['estimated_exhibitors_lte'],
    //     })
    //     .transform(Number)
    //     .optional(),
    //   estimated_exhibitors_gte: z
    //     .string()
    //     .refine(refineRange.rangeCheck, {
    //       message: refineRange.message.message,
    //       path: ['estimated_exhibitors_gte'],
    //     })
    //     .transform(Number)
    //     .optional(),
    //   status: z
    //     .string()
    //     // .default('ACTIVE,CANCELLED,POSTPONED,PREDICTED,UNVERIFIED')
    //     .refine(
    //       (data) => {
    //         const status = data?.split(',').map((item) => item.trim());
    //         return status!.every((item) =>
    //           Object.values(EventStatus).includes(
    //             item.toUpperCase() as unknown as EventStatus,
    //           ),
    //         );
    //       },
    //       {
    //         message: 'Invalid status',
    //         path: ['status'],
    //         params: {
    //           validOptions: Object.values(EventStatus)
    //             .map((val) => val.toLowerCase())
    //             .join(', '),
    //         },
    //       },
    //     )
    //     .transform((data) => {
    //       return data
    //         .split(',')
    //         .map((item) => item.trim().toLowerCase()) as unknown as EventStatus[];
    //     })
    //     .optional(),
    //   maturity: z
    //     .string()
    //     .refine((val) => val.split(',').every((item) => item in Maturity))
    //     .transform((val) => val.split(','))
    //     .optional(),
    //   onlyBranded: z
    //     .string()
    //     .refine((val) => ['true', 'false'].includes(val))
    //     .transform((val) => Boolean(val))
    //     .optional(),
    //   onlySeries: z
    //     .string()
    //     .refine((val) => ['true', 'false'].includes(val))
    //     .transform((val) => Boolean(val))
    //     .optional(),
    show: z
        .string()
        .refine((val) => val.split(',').every((item) => item in Show))
        .transform((val) =>
            val.split(',').map((item) => item.trim() as unknown as Show),
        )
        .optional(),
    //   ratings: z
    //     .string()
    //     .refine((val) => val.split(',').every((item) => item in Rating))
    //     .transform((val) => val.split(','))
    //     .optional(),
    //   frequencies: z
    //     .string()
    //     .refine((val) => val.split(',').every((item) => item in Frequency))
    //     .transform((val) => val.split(','))
    //     .optional(),
    //   trust_score_lte: z
    //     .string()
    //     .refine(refineScore.scoreCheck, {
    //       message: refineScore.message.message,
    //       path: ['trust_score_lte'],
    //     })
    //     .transform(Number)
    //     .optional(),
    //   trust_score_gte: z
    //     .string()
    //     .refine(refineScore.scoreCheck, {
    //       message: refineScore.message.message,
    //       path: ['trust_score_gte'],
    //     })
    //     .transform(Number)
    //     .optional(),
    //   eventFormats: z
    //     .string()
    //     .refine((val) => val.split(',').every((item) => item in EventFormat))
    //     .transform((val) =>
    //       val
    //         .split(',')
    //         .map((item) => (item.trim() === 'offline' ? 'in_person' : item.trim())),
    //     )
    //     .optional(),
    //   entryType: z
    //     .string()
    //     .refine((val) => val.split(',').every((item) => item in EntryType))
    //     .transform((val) => val.split(','))
    //     .optional(),
    //   editions_lte: z
    //     .string()
    //     .refine(refineRange.rangeCheck, {
    //       message: refineRange.message.message,
    //       path: ['editions_lte'],
    //     })
    //     .transform(Number)
    //     .optional(),
    //   editions_gte: z
    //     .string()
    //     .refine(refineRange.rangeCheck, {
    //       message: refineRange.message.message,
    //       path: ['editions_gte'],
    //     })
    //     .transform(Number)
    //     .optional(),
    //   category_rank_lte: z
    //     .string()
    //     .refine(refineRange.rangeCheck, {
    //       message: refineRange.message.message,
    //       path: ['category_rank_lte'],
    //     })
    //     .transform(Number)
    //     .optional(),
    //   category_rank_gte: z
    //     .string()
    //     .refine(refineRange.rangeCheck, {
    //       message: refineRange.message.message,
    //       path: ['category_rank_gte'],
    //     })
    //     .transform(Number)
    //     .optional(),
    //   country_rank_lte: z
    //     .string()
    //     .refine(refineRange.rangeCheck, {
    //       message: refineRange.message.message,
    //       path: ['country_rank_lte'],
    //     })
    //     .transform(Number)
    //     .optional(),
    //   country_rank_gte: z
    //     .string()
    //     .refine(refineRange.rangeCheck, {
    //       message: refineRange.message.message,
    //       path: ['country_rank_gte'],
    //     })
    //     .transform(Number)
    //     .optional(),
    //   category_country_rank_lte: z
    //     .string()
    //     .refine(refineRange.rangeCheck, {
    //       message: refineRange.message.message,
    //       path: ['category_country_rank_lte'],
    //     })
    //     .transform(Number)
    //     .optional(),
    //   category_country_rank_gte: z
    //     .string()
    //     .refine(refineRange.rangeCheck, {
    //       message: refineRange.message.message,
    //       path: ['category_country_rank_gte'],
    //     })
    //     .transform(Number)
    //     .optional(),
    //   audienceSpread: z
    //     .string()
    //     .refine((val) => val.split(','))
    //     .transform((val) => val.split(','))
    //     .optional(),
    //   audienceSpreadRegions: z
    //     .string()
    //     .refine((val) =>
    //       val
    //         .split(',')
    //         .every((item) => (item.trim() as keyof typeof Regions) in Regions),
    //     )
    //     .transform((val) => val.split(',').map((item) => item.trim()))
    //     .optional(),
    //   audienceZone: z
    //     .string()
    //     .refine((val) => val.split(',').every((item) => item in AudienceZone))
    //     .transform((val) => val.split(','))
    //     .optional(),
    //   estimatedVisitors: z
    //     .string()
    //     .refine((val) => val.split(','))
    //     .transform((val) => val.split(','))
    //     .optional(),
    //   estimatedExhibitors: z
    //     .string()
    //     .refine((val) => val.split(','))
    //     .transform((val) => val.split(','))
    //     .optional(),
    //   economic_impact_lte: z
    //     .string()
    //     .refine(refineRange.rangeCheck, {
    //       message: refineRange.message.message,
    //       path: ['economic_impact_lte'],
    //     })
    //     .transform(Number)
    //     .optional(),
    //   economic_impact_gte: z
    //     .string()
    //     .refine(refineRange.rangeCheck, {
    //       message: refineRange.message.message,
    //       path: ['economic_impact_gte'],
    //     })
    //     .transform(Number)
    //     .optional(),
    //   top: z.string().transform(Number).optional(),
    includeKeywords: z
        .string()
        .transform((val) => val.split(','))
        .optional(),
    excludeKeywords: z
        .string()
        .transform((val) => val.split(','))
        .optional(),
    //   regions: z
    //     .string()
    //     .refine(
    //       (val) =>
    //         val.split(',').every((item) => Regions[item as keyof typeof Regions]),
    //       { params: { validOptions: Object.keys(Regions).join(', ') } },
    //     )
    //     .transform((val) => val.split(','))
    //     .optional(),
    //   eventTypeGroup: z
    //     .string()
    //     .refine((val) => val in EventTypeGroup, {
    //       message: 'Invalid eventTypeGroup',
    //       params: { validOptions: Object.keys(EventTypeGroup).join(', ') },
    //     })
    //     .optional(),
    createdAt: z
        .string()
        .refine(
            (date) =>
                date &&
                new Date(date).toISOString().split('T')[0] === date.split('T')[0],
        )
        .transform((date) => new Date(date).toISOString().split('T')[0])
        .optional(),
    //   estimatedVisitorRangeTag: z
    //     .string()
    //     .refine((val) =>
    //       val.split(',').every((item) => item.toUpperCase() in VisitorRangeTag),
    //     )
    //     .transform((val) => val.split(',').map((item) => item.toUpperCase()))
    //     .optional(),
    //   countries: z
    //     .string()
    //     .transform((data) => {
    //       if (!data) return [];
    //       return data?.split(',').map((item) => item.trim());
    //     })
    //     .optional(),
    jobComposite: z
        .string()
        .optional()
        .transform((val) => {
            if (!val) return undefined;
            try {
                return JSON.parse(val);
            } catch {
                return undefined;
            }
        })
        .refine(
            (val) => val === undefined || jobCompositeSchema.safeParse(val).success,
            {
                message: 'Invalid jobComposite format',
            }
        )
        .transform((val) => {
            if (!val) return undefined;
            return JSON.stringify(val);
        }),
    orgName: z.string().optional(),
    // orgId: z.string().optional(),
    orgWebsite: z.string().optional(),
    userName: z.string().optional(),
    userOrgWebsite: z.string().optional(),
    // userSocialLink: z.string().optional(),
    // userDepartment: z.string().optional(),
    // userRole: z.string().optional(),
    // userDesignation: z.string().optional(),
    searchByEntity: z
        .string()
        .refine((val) => val in SearchByEntity)
        .transform((val) => val as keyof typeof SearchByEntity)
        .optional(),
    trackerEventStatus: z
        .string()
        .refine((val) => val in TrackerEventStatus)
        .transform((val) => val as keyof typeof TrackerEventStatus)
        .optional(),
    // showValues: z.string(),
    view: z.nativeEnum(View).optional().default(View.list),
    trackerDates: z.string().optional(),
    dates: z.string().optional(),
}).strict();

// export const FilterNames = Object.keys(QueryFilter.shape);

export class QueryFilterDto extends createZodDto(QueryFilter) { }