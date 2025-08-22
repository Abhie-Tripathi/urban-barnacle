import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
// Define DTOs as Zod schemas

export const AccessEmailDataSchema = z.strictObject({
  accessMetaData: z.object({
    givenToUserEmail: z.string(),
    givenByUserEmail: z.string(),
    givenByUserDesignation: z.string().nullable().optional().default(''),
    givenToUserName: z.string(),
    givenByUserName: z.string(),
  }),
  redirectUrl: z.string(),
  trackerName: z.string(),
  sourceId: z.string(),
});

export class AccessEmailDataDto extends createZodDto(AccessEmailDataSchema) { }

export const EventCancelDataSchema = z.strictObject({
  email: z.array(z.string()),
  eventName: z.any(),
  userId: z.string(),
  userEmail: z.string(),
  sourceId: z.string(),
});

export class EventCancelDataDto extends createZodDto(EventCancelDataSchema) { }

export const IntendCaptureDataSchema = z.object({
  userShowedInterestName: z.string(),
  userShowedInterestEmail: z.string(),
  eventOwnerEmail: z.string(),
  eventOwnerName: z.string(),
  eventName: z.string(),
  pending: z.string(),
  going: z.string(),
  waitlist: z.string(),
  inviteCount: z.string(),
  eventStartDate: z.string(),
  eventEndDate: z.string(),
  eventLocation: z.string(),
  userShowedInterestType: z.string(),
  eventRedirectUrl: z.string(),
  sourceId: z.string(),
});

export class IntendCaptureDataDto extends createZodDto(
  IntendCaptureDataSchema,
) { }

export const IntendUpdateDataSchema = z.object({
  userShowedInterestName: z.string(),
  userShowedInterestEmail: z.string(),
  eventName: z.string(),
  eventStartDate: z.string(),
  eventEndDate: z.string(),
  eventLocation: z.string(),
  userShowedInterestType: z.string(),
  eventRedirectUrl: z.string(),
  sourceId: z.string(),
});

export class IntendUpdateDataDto extends createZodDto(IntendUpdateDataSchema) { }

export const OtpEmailDataSchema = z.strictObject({
  otp: z.string(),
  userInfo: z.any(),
  process: z.string(),
  sourceId: z.string(),
});

export class OtpEmailDataDto extends createZodDto(OtpEmailDataSchema) { }

export const InviteEmailDataSchema = z.strictObject({
  userEmail: z.string(),
  eventName: z.string(),
  eventStartDate: z.string(),
  eventEndDate: z.string(),
  eventLocation: z.string(),
  eventRedirectUrl: z.string(),
  encryptYes: z.string(),
  encryptNo: z.string(),
  sourceId: z.string(),
});

export class InviteEmailDataDto extends createZodDto(InviteEmailDataSchema) { }
export const errorMailSchema = z.object({
  apiName: z.string(),
  errorType: z.string(),
  errorMessage: z.string(),
})

export const demoContactSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  source: z.string(),
  companyName: z.string(),
  jobTitle: z.string(),
  phoneNumber: z.string(),
  sourceId: z.string(),
})
export class DemoContactDto extends createZodDto(demoContactSchema) { }
export const contactUsSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  message: z.string(),
  source: z.string(),
  sourceId: z.string(),
})
export class ContactUsDto extends createZodDto(contactUsSchema) { }
export const ErrorContactSchema = z.object({
  email: z.string(),
  userLimit: z.string(),
  dailyLimit: z.string(),
  time: z.string(),
  name: z.string(),
  sourceId: z.string(),
})
export class ErrorContactDto extends createZodDto(ErrorContactSchema) { }
const userInviteSchema = z.object({
  referredByUserName: z.string(),
  invitedUserEmail: z.string(),
  sourceId: z.string(),
})
export class UserInviteDto extends createZodDto(userInviteSchema) { }

const trackerExportInputSchema = z.object({
  userData: z.any(),
  sourceId: z.string(),
  trackerId: z.string(),
  searchByEntity: z.string().optional(),
  redirectUrl: z.string(),
  exportIdNew: z.string().optional(),
  exportIdActive: z.string().optional(),
  exportIdPast: z.string().optional(),
  exportIdBusiness: z.string().optional(),
  exportIdSocial: z.string().optional(),
  exportIdUnattended: z.string().optional(),
  type: z.enum(['all', 'past', 'active', 'new', 'business', 'social', 'unattended']),
  source: z.literal('TRACKER').default('TRACKER'),
  plan: z.number(),
  totalTokenNeededForExport: z.number().optional(),
});

export class trackerExportDto extends createZodDto(trackerExportInputSchema) { }

const usertrackerImportchema = z.object({
  email: z.string(),
  sourceId: z.string()
})
export class UserTrackerImportDto extends createZodDto(usertrackerImportchema) { }
const subscriptionCancel = z.strictObject({
  userId: z.string(),
  stripeId: z.string(),
  cancelDate: z.string(),
  subscriptionId: z.string(),
  qna: z.record(z.string(), z.string()).optional(),
  feedback: z.string(),
  sourceId: z.string(),
  userEmail: z.string(),
});
export class SubscriptionCancelDto extends createZodDto(subscriptionCancel) { }
// Union of all DTO schemas
export const PayloadDTO = z.union([
  AccessEmailDataSchema,
  EventCancelDataSchema,
  IntendCaptureDataSchema,
  IntendUpdateDataSchema,
  OtpEmailDataSchema,
  InviteEmailDataSchema,
  errorMailSchema,
  demoContactSchema,
  userInviteSchema,
  contactUsSchema,
  ErrorContactSchema,
  trackerExportInputSchema,
  usertrackerImportchema,
  subscriptionCancel,
]);
