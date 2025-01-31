import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EnquiryStatus } from '@prisma/client';

const EnquiryCountSchema = z.object({
  total: z.number(),
  attend: z.number().optional(),
  speak: z.number().optional(),
  sponsor: z.number().optional(),
  exhibit: z.number().optional(),
});

export const EnquiryResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.nativeEnum(EnquiryStatus),
  eventId: z.string().uuid(),
  eventData: z.object({
    name: z.string(),
    endDate: z.string(),
    eventId: z.string().uuid(),
    startDate: z.string(),
    name_lower: z.string(),
  }),
  ownerId: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  interestedCount: EnquiryCountSchema,
  activityCount: EnquiryCountSchema,
  followerCount: z.number().optional(),
});

export class EnquiryResponseDto extends createZodDto(EnquiryResponseSchema) {}
