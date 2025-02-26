import { User, UserRole } from '@prisma/client';
import { object, z } from 'zod';
import { FastifyRequest } from 'fastify';
import { TCachedUser } from 'src/utils/types';

// export type CachedUser = Pick<
//   User,
//   'id' | 'email' | 'role' | 'firstname'
// >;

// export const CachedUserSchema = z.object({
//   id: z.string(),
//   email: z.string(),
//   role: z.nativeEnum(UserRole),
//   firstname: z.string().optional(),
// }) as z.ZodType<CachedUser>;

// export type TCachedUser = CachedUser & {
//   accountId: string;
//   token: string;
// };
export type RequestWithUser = FastifyRequest & { user: TCachedUser };
export type TrackerParams = {
  orgName?: string;
  orgId?: string;
  orgWebsite?: string;
  eventId?: string;
  eventName?: string;
  // eventVenue: string,
  eventCategory?: string;
  eventStatus?: string;
  eventCountry?: string;
  eventCity?: string;
  eventType?: string;
  // eventAudience: z
  //   .string()
  //   .optional()
  //   .transform((value) => {
  //     if (value !== undefined && value !== null) {
  //       return value.toUpperCase().split(',');
  //     }
  //     return value;
  //   }),
  eventFormat?: string;
  userSocialLink?: string;
  eventKeywords?: string; /// include exculde in one seperated by +-
  eventEntry?: string;
  eventSize?: string;
  eventRating?: string;
  eventRegion?: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  groupBy?: string;
  sortBy?: string;
  sortType?: string;
  labels?: string;
  eventRank?: string;
  eventAttendanceRange?: string;
  eventRanking?: string;
  eventFrequency?: string;
  eventSeries?: string;
  trustScore?: string;
  editionRange?: string;
  localRank?: string;
  avaiationRank?: string;
  reputationScore?: string;
  inboundScore?: string;
  internationalScore?: string;
  maturity?: string;
  createdAt?: string;
  type?: string;
  count?: boolean;
  groupDate?: string;
  expired?: string;
  speakerName?: string;
  speakerOrg?: string;
  mapRadius?: string;
  longitude?: string;
  latitude?: string;
  userName?: string;
  userDesignation?: string;
  userRole?: string;
  userDepartment?: string;
  userType?: string;
  estimatedExhibitScore?: string;
  isforecasted?: string;
  eventNameExcept?: string;
  stats?: string;
  categoryRanking?: string;
  globalRanking?: string;
  countryRanking?: string;
  eventImpactSocre?: string;
  eventBrand?: string;
  fileLink?: string;
  trackerType?: string;
  shows?: string;
  audienceSpread?: string;
  audienceZone?: string;
  economicImpact?: string;
  designation?: string;
  locationIds?: string;
  includeKeywords?: string;
  excludeKeywords?: string;
};

export interface LastActive {
  last_active_gte: string;
  last_active_lte: string;
}

export interface TrackerParamsOptions extends LastActive, TrackerParams { }

export const phoneNumberRegex =
  /^[+]{1}[0-9]{1,3}(?:[0-9\-\(\)\/\.]\s?){6,14}[0-9]{1}$/;

export const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*d)(?=.*[@$!%*?&])[A-Za-zd@$!%*?&]{8,}$/;

export enum Industries {
  Accomodation,
  Transportation,
  Restaurants,
}

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


export enum PointColumn {
  pendingRequests = "pendingRequests",
  pendingPocUnlockRequests = "pendingPocUnlockRequests",
  pendingCompanySearchRequests = "pendingCompanySearchRequests",
  pendingProspectPocUnlockRequests = "pendingProspectPocUnlockRequests"
}