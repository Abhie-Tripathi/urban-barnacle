import {
  GeomType,
  JobSource,
  LocationType,
  OnboardingState,
  RadiusUnit,
  SubscriptionPlan,
  User,
  UserRole,
} from '@prisma/client';
import { query, Request, request } from 'express';
import { z } from 'zod';

export const GeoJsonSchema = z.object({
  geometry: z.object({
    type: z
      .string()
      .transform((data) =>
        data.toUpperCase() in GeomType ? data.toUpperCase() : null,
      ),
    coordinates: z.array(z.number()).length(2),
  }),
  properties: z.object({
    locationName: z.string().optional(),
    radius: z.number().positive(),
    radiusUnit: z
      .string()
      .transform((data) =>
        data.toUpperCase() in RadiusUnit ? data.toUpperCase() : null,
      ),
  }),
});
export type GeoJson = z.infer<typeof GeoJsonSchema>;

export type SelectedUserDetails = Pick<
  User,
  | 'id'
  | 'email'
  | 'firstname'
  | 'lastname'
  | 'role'
  | 'phoneNumber'
  | 'currentOnboardingState'
  | 'imageUrl'
  | 'industry'
  | 'subIndustry'
  | 'primaryLocation'
  | 'category'
  | 'primaryCompanyId'
  | 'primaryAccountId'
  | 'department'
  | 'designation'
> & {
  accountId: string;
  accountConfigurationId: string;
  currentSubscriptionId: string;
};

export type TCachedUser = SelectedUserDetails & {
  token: string;
};

export const PrimaryLocationSchema = z.object({
  locationType: z.nativeEnum(LocationType).optional(),
  geoJson: GeoJsonSchema.optional(),
  locationId: z.string().optional(),
});

export const CachedUserSchema: z.ZodType<SelectedUserDetails> = z.object({
  id: z.string(),
  email: z.string(),
  firstname: z.string().nullable(),
  lastname: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  currentOnboardingState: z.nativeEnum(OnboardingState),
  imageUrl: z.string().nullable(),
  industry: z.string().nullable(),
  subIndustry: z.string().nullable(),
  primaryLocation: PrimaryLocationSchema.nullable(),
  category: z.string().nullable(),
  primaryCompanyId: z.string().nullable(),
  primaryAccountId: z.string().nullable(),
  designation: z.string().nullable(),
  department: z.string().nullable(),
  accountId: z.string(),
  currentSubscriptionId: z.string(),
  role: z.nativeEnum(UserRole),
  accountConfigurationId: z.string(),
});

export const Industries = {
  geo: {
    Hospitality: 'Hospitality',
    Local_Commerce: 'Local_Commerce',
    Transportation_Logistics: 'Transportation_Logistics',
    Venue_Real_Estate: 'Venue_Real_Estate',
    Event_Planners: 'Event_Planners',
    Civic_Commerce_Tourism: 'Civic_Commerce_Tourism',
    Activity_Planners: 'Activity_Planners',
    Media_Marketing: 'Media_Marketing',
    Corporate_Brands: 'Corporate_Brands',
    Others: 'Others',
    Infra_Technology: 'Infra_Technology'
  },
  gtm: {
    Media_Marketing: 'Media_Marketing',
    Research_MA: 'Research_MA',
    Event_Planners: 'Event_Planners',
    Corporate_Brands: 'Corporate_Brands',
    Infra_Technology: 'Infra_Technology',
    Venue_Real_Estate: 'Venue_Real_Estate',
    Others: 'Others',
  },
};

export const defaultEventTypes = {
  geo: {
    festival: 'e5283caa-f655-504b-8e44-49ae0edb3faa',
    sport: 'bffa5040-c654-5991-a1c5-0610e2c0ec74',
    concert: '69cf1329-0c71-5dae-b7a9-838c5712bce0',
    'stage-performance': '94fcb56e-2838-5d74-9092-e582d873a03e',
    'community-group': '3a3609e5-56df-5a8b-ad47-c9e168eb4f59',
    tradeshows: '9b5524b4-60f5-5478-b3f0-38e2e12e3981',
    conferences: '4de48054-46fb-5452-a23f-8aac6c00592e',
    workshops: 'ad7c83a5-b8fc-5109-a159-9306848de22c',
    holiday: '5b37e581-53f7-5dcf-8177-c6a43774b168',
  },
  gtm: {
    tradeshows: '9b5524b4-60f5-5478-b3f0-38e2e12e3981',
    conferences: '4de48054-46fb-5452-a23f-8aac6c00592e',
    workshops: 'ad7c83a5-b8fc-5109-a159-9306848de22c',
  },
};

export const ValidEventTypes = {
  geo: [
    'festival',
    'sport',
    'concert',
    'stage-performance',
    'community-group',
    'tradeshows',
    'conferences',
    'workshops',
    'holiday',
    'alert',
  ],
  gtm: ['tradeshows', 'conferences', 'workshops'],
};

export const SubIndustries = {
  Retail: 'Retail',
  Quick_Commerce: 'Quick_Commerce',
  Local_Government: 'Local_Government',
  Parking: 'Parking',
  Others: 'Others',
};
export const RequestJsonSchema = z.object({
  id: z.string(),
  path: z.string(),
  request: z.object({
    method: z.string(),
    body: z.record(z.unknown()),
    query: z.record(z.unknown()),
  }),
  createdAt: z.date(),
});

export const phoneNumberRegex =
  /^[+]{1}[0-9]{1,3}(?:[0-9\-\(\)\/\.]\s?){6,14}[0-9]{1}$/;

export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*d)(?=.*[@$!%*?&])[A-Za-zd@$!%*?&]{8,}$/;

export type RequestWithUser = Request & { user: TCachedUser };

export enum EventStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  POSTPONED = 'POSTPONED',
  PREDICTED = 'PREDICTED',
  UNVERIFIED = 'UNVERIFIED',
}

export enum VisitorRangeTag {
  NANO = 'NANO',
  MICRO = 'MICRO',
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  MEGA = 'MEGA',
  ULTRA = 'ULTRA',
}

export enum EventTypeGroup {
  'business' = 'business',
  'social' = 'social',
  'unattended' = 'unattended',
}

export enum CategoryType {
  ATTENDED = 'ATTENDED',
  NON_ATTENDED = 'NON_ATTENDED',
  UNSCHEDULED = 'UNSCHEDULED',
}

export const TrackerTypes = {
  trackers: {
    T_PEOPLE_FINDER: 'T_PEOPLE_FINDER',
    T_COMPETITOR: 'T_COMPETITOR',
    T_SPEAKING_OPPORTUNITY: 'T_SPEAKING_OPPORTUNITY',
    T_CUSTOMER_ICP: 'T_CUSTOMER_ICP',
    T_PRODUCT_KEYWORDS: 'T_PRODUCT_KEYWORDS',
    T_RECRUITMENT: 'T_RECRUITMENT',
    T_LOCATION: 'T_LOCATION',
    T_VENUE: 'T_VENUE',
    T_GEOTIME: 'T_GEOTIME',
    T_CUSTOM: 'T_CUSTOM',
  },
  trends: {
    TR_CUSTOM: 'TR_CUSTOM',
  },
};

export enum QueueActionOptions {
  SEND_SIGN_UP_IN_EMAIL = 'SEND_SIGN_UP_IN_EMAIL',
  SEND_EVENT_CANCEL_EMAIL = 'SEND_EVENT_CANCEL_EMAIL',
  SEND_PROMOTED_EVENT_INVITAION_EMAIL = 'SEND_PROMOTED_EVENT_INVITAION_EMAIL',
  SEND_USER_INVITATION_EMAIL = 'SEND_USER_INVITATION_EMAIL',
  SEND_TRACKER_ACCESS_EMAIL = 'SEND_TRACKER_ACCESS_EMAIL',
  SEND_EVENT_INTEND_CAPTURE_EMAIL = 'SEND_EVENT_INTEND_CAPTURE_EMAIL',
  SEND_EVENT_INTEND_UPDATE_EMAIL = 'SEND_EVENT_INTEND_UPDATE_EMAIL',
  SEND_INTEND_CAPTURE_EMAIL = 'SEND_INTEND_CAPTURE_EMAIL',
  SEND_INTEND_UPDATE_EMAIL = 'SEND_INTEND_UPDATE_EMAIL',
  SEND_ERROR_EMAIL = 'SEND_ERROR_EMAIL',
  SEND_DEMO_CONTACT_EMAIL = 'SEND_DEMO_CONTACT_EMAIL',
  SEND_CONTACT_US_EMAIL = 'SEND_CONTACT_US_EMAIL',
  SEND_CONTACT_ERROR_EMAIL = 'SEND_CONTACT_ERROR_EMAIL',
  SEND_TRACKER_EXPORT_MAIL = 'SEND_TRACKER_EXPORT_MAIL',
  CRON_USER_TRACKER_IMPORT = 'CRON_USER_TRACKER_IMPORT',
  SEND_SUBSCRIPTION_CANCEL_MAIL = 'SEND_SUBSCRIPTION_CANCEL_MAIL',
}

// export type TrackerParams = {
//   category: string[];
//   labels: string[];
//   city: string[];
//   active_gte: string;
//   active_lte: string;
//   event_rank_lte: number;
//   event_rank_gte: number;
//   local_rank_lte: number;
//   local_rank_gte: number;
//   aviation_rank_lte: number;
//   aviation_rank_gte: number;
//   total_attendance_lte: number;
//   total_attendance_gte: number;
//   status: EventStatus[];
// };

// export interface LastActive {
//   last_active_gte: string;
//   last_active_lte: string;
// }

export interface LastActive {
  last_active_gte: string;
  last_active_lte: string;
}

// export interface TrackerParamsOptions extends LastActive, TrackerParams {}

export const blackListDomain = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'live.com',
  'protonmail.com',
  'zoho.com',
  'mail.com',
  'yandex.com',
  'gmx.com',
  'inbox.com',
  'me.com',
  'msn.com',
  'qq.com',
  'rediffmail.com',
  'rocketmail.com',
  'hushmail.com',
  'lycos.com',
  'fastmail.com',
  'tutanota.com',
  'gmx.net',
  'verizon.net',
  'comcast.net',
  'cox.net',
  'btinternet.com',
  'sbcglobal.net',
  'bellsouth.net',
  'charter.net',
  'earthlink.net',
  'att.net',
  'frontier.com',
  'shaw.ca',
  'rogers.com',
  'telus.net',
  'virginmedia.com',
  'blueyonder.co.uk',
  'ntlworld.com',
  'wanadoo.fr',
  'orange.fr',
  'sky.com',
  'tiscali.co.uk',
  'talktalk.net',
  'ntl.com',
  'o2.co.uk',
  'eircom.net',
  'freenet.de',
  'web.de',
  'alice.it',
];
export const membershipMap: Record<SubscriptionPlan, number> = {
  BASIC: 0,
  ESSENTIAL: 10,
  SCALE: 20,
  ADVANCE: 30,
  ENTERPRISE: 40,
};
export const membershipLimit: Record<number, number> = {
  0: 4000,
  10: 4000,
  20: 4000,
  30: 20000,
  40: 100000,
};
export const membershipMapForToken: Record<SubscriptionPlan, { pendingRequests: number, pendingCompanySearchRequests: number }> = {
  BASIC: {
    pendingCompanySearchRequests: 20,
    pendingRequests: 200
  },
  ESSENTIAL: {
    pendingCompanySearchRequests: 200,
    pendingRequests: 200
  },
  SCALE: {
    pendingCompanySearchRequests: 200,
    pendingRequests: 200
  },
  ADVANCE: {
    pendingCompanySearchRequests: 1000,
    pendingRequests: 1000
  },
  ENTERPRISE: {
    pendingCompanySearchRequests: 5000,
    pendingRequests: 5000
  },
};
// ["a4a3b8d9-e170-4972-8981-0282e58ccb45","e485cdd3-0e61-5f36-b896-aed7ba606697","0ba63d1a-eb97-4587-b1c7-6c79c2948256",1,0]

// SELECT
//          T.*,
//          a."createdAt" "accesscreatedAt",
//          a.deleted "accessDeleted",
//          json_build_object(
//            'id', U.ID,
//            'email', U.email,
//            'firstName', U."firstname",
//            'lastName', U."lastname",
//            'imageUrl', U."imageUrl"
//          ) as "createdByUser",
//          json_build_object(
//            'id', U2.ID,
//            'email', U2.email,
//            'firstName', U2."firstname",
//            'lastName', U2."lastname",
//            'imageUrl', U2."imageUrl"
//          ) as "modifiedByUser"
//        FROM
//          "Tracker" T
//           JOIN "User" U ON T."createdBy" = U.ID
//          LEFT JOIN "User" U2 ON T."lastModifiedBy" = U2.ID
//           JOIN "Access" A ON T.ID = A."sourceEntityId"::UUID
//          AND A."sourceEntity" = 'TRACKER'
//          AND A."accessReceiverId" = 'a4a3b8d9-e170-4972-8981-0282e58ccb45'::UUID
//          AND A."accountId" = 'e485cdd3-0e61-5f36-b896-aed7ba606697'::UUID
//        WHERE
//          T.DELETED = false
//            AND T.ID::TEXT IN ('0ba63d1a-eb97-4587-b1c7-6c79c2948256')
//        ORDER BY
//          T."createdAt" DESC
//        LIMIT
//          10
//        OFFSET
//          0;
