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
  eventData: z.any(),
  owner: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string(),
      imageUrl: z.string().nullable().optional(),
    })
    .nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  interestedCount: EnquiryCountSchema,
  activityCount: EnquiryCountSchema,
  followerCount: z.number().optional(),
  myActivity: z.array(
    z.object({
      id: z.string(),
      activityType: z.string(),
      activitySubType: z.string().nullable(),
    }),
  ),
  isProductEvent: z.boolean()
});

export class EnquiryResponseDto extends createZodDto(EnquiryResponseSchema) { }
