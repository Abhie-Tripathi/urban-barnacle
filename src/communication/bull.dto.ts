import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
// Define DTOs as Zod schemas

export const AccessEmailDataSchema = z.object({
  accessMetaData: z.object({
    givenToUserEmail: z.string(),
    givenByUserEmail: z.string(),
    givenByUserDesignation: z.string().nullable().optional().default(''),
    givenToUserName: z.string(),
    givenByUserName: z.string(),
  }),
  redirectUrl: z.string(),
  trackerName: z.string(),
  // jobRequestId: z.string(),
});

export class AccessEmailDataDto extends createZodDto(AccessEmailDataSchema) {}

export const EventCancelDataSchema = z.object({
  email: z.array(z.string()),
  eventName: z.any(),
  userId: z.string(),
  userEmail: z.string(),
  // jobRequestId: z.string(),
});

export class EventCancelDataDto extends createZodDto(EventCancelDataSchema) {}

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
  // jobRequestId: z.string(),
});

export class IntendCaptureDataDto extends createZodDto(
  IntendCaptureDataSchema,
) {}

export const IntendUpdateDataSchema = z.object({
  userShowedInterestName: z.string(),
  userShowedInterestEmail: z.string(),
  eventName: z.string(),
  eventStartDate: z.string(),
  eventEndDate: z.string(),
  eventLocation: z.string(),
  userShowedInterestType: z.string(),
  eventRedirectUrl: z.string(),
  // jobRequestId: z.string(),
});

export class IntendUpdateDataDto extends createZodDto(IntendUpdateDataSchema) {}

export const OtpEmailDataSchema = z.object({
  otp: z.string(),
  userInfo: z.any(),
  process: z.string(),
  // jobRequestId: z.string(),
});

export class OtpEmailDataDto extends createZodDto(OtpEmailDataSchema) {}

export const InviteEmailDataSchema = z.object({
  userEmail: z.string(),
  eventName: z.string(),
  eventStartDate: z.string(),
  eventEndDate: z.string(),
  eventLocation: z.string(),
  eventRedirectUrl: z.string(),
  encryptYes: z.string(),
  encryptNo: z.string(),
});

export class InviteEmailDataDto extends createZodDto(InviteEmailDataSchema) {}

// Union of all DTO schemas
export const PayloadDTO = z.union([
  AccessEmailDataSchema,
  EventCancelDataSchema,
  IntendCaptureDataSchema,
  IntendUpdateDataSchema,
  OtpEmailDataSchema,
  InviteEmailDataSchema,
]);
