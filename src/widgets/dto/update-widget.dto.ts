import { WidgetStatus, WidgetType } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const WidgetUpdate = z.object({
  // templatePublicId: z.string().transform(Number).optional(),
  // type: z.nativeEnum(Type).optional(),
  status: z.nativeEnum(WidgetStatus).optional(),
  customizationData: z.record(z.any(), z.any()).optional(),
  otherdata: z.record(z.any(), z.any()).optional(),
  domain: z.string().optional(),
  deleted: z
    .boolean()
    .optional()
});
export class UpdateWidgetsDto extends createZodDto(WidgetUpdate) {}
export const UpdateKitDto = z.strictObject({
  data: z.record(z.any(), z.any()).optional(),
  otherData: z.record(z.any(), z.any()).optional(),
  color: z.string().optional(),
  fontFamily: z.string().optional(),
  published: z.boolean().optional(),
  logoUrl: z.string().optional(),
});
export class UpdateWidgetKitDto extends createZodDto(UpdateKitDto) {}
export const UpdateeventDto = z.strictObject({
  id: z.string(),
  name: z.string().optional(),
  data: z.string().optional(),
  published: z
    .string()
    .optional()
    .transform((val) =>
      val === undefined ? undefined : val === 'true' ? true : false,
    ),
});

export class UpdateEventDto extends createZodDto(UpdateeventDto) {}

export class UpdateWidgetDto {}
