import { z } from 'zod';

// Define DTOs as Zod schemas

export const AccessEmailDataDTO = z.object({
  accessMetaData: z.object({
    givenToUserEmail: z.string(),
    givenByUserEmail: z.string(),
    givenByUserDesignation: z.string(),
    givenToUserName: z.string(),
    givenByUserName: z.string(),
  }),
  redirectUrl: z.string(),
  trackerName: z.string(),
  // jobRequestId: z.string(),
});

export const EventCancelDataDTO = z.object({
  email: z.array(z.string()),
  eventName: z.any(),
  userId: z.string(),
  userEmail: z.string(),
  // jobRequestId: z.string(),
});

export const IntendCaptureDataDTO = z.object({
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

export const IntendUpdateDataDTO = z.object({
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

export const OtpEmailDataDTO = z.object({
  otp: z.string(),
  userInfo: z.any(),
  process: z.string(),
  // jobRequestId: z.string(),
});
export const InviteEmailDataDTO = z.object({
  userEmail: z.string(),
  eventName: z.string(),
  eventStartDate: z.string(),
  eventEndDate: z.string(),
  eventLocation: z.string(),
  eventRedirectUrl: z.string(),
  encryptYes: z.string(),
  encryptNo: z.string(),
});
// Union of all DTO schemas
export const PayloadDTO = z.union([
  AccessEmailDataDTO,
  EventCancelDataDTO,
  IntendCaptureDataDTO,
  IntendUpdateDataDTO,
  OtpEmailDataDTO,
  InviteEmailDataDTO,
]);
