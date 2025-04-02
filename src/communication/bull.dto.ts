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
  body: z.string()
})
// Union of all DTO schemas
export const PayloadDTO = z.union([
  AccessEmailDataSchema,
  EventCancelDataSchema,
  IntendCaptureDataSchema,
  IntendUpdateDataSchema,
  OtpEmailDataSchema,
  InviteEmailDataSchema,
  errorMailSchema,
  demoContactSchema
]);
