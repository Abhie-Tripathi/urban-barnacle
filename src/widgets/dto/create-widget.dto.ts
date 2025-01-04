import { WidgetStatus, WidgetType } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const Widget = z.object({
  templatePublicId: z.string().transform(Number),
  type: z.string().transform((val) => val as WidgetType),
  status: z.string().transform((val) => val as WidgetStatus),
  customizationData: z.record(z.any(), z.any()),
  otherdata: z.record(z.any(), z.any()).optional(),
  domain: z.string().optional(),
});

export class CreateWidgetDto extends createZodDto(Widget) {}

export const eventDto = z.strictObject({
  name: z.string(),
  data: z.string(),
});

export class CreateEventDto extends createZodDto(eventDto) {}

const KitDto = z.strictObject({
  url: z.string(),
});
export class CreateWidgetKitDto extends createZodDto(KitDto) {}

const Central = z.strictObject({
  widgetId: z.string().optional(),
  templatePublicId: z.string().optional(),
  type: z
    .string()
    .optional()
    .transform((val) => (val != undefined ? (val as WidgetType) : undefined)),
  status: z
    .string()
    .optional()
    .transform((val) => (val != undefined ? (val as WidgetStatus) : undefined)),
  customizationData: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? JSON.parse(val) : undefined)),
  otherdata: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? JSON.parse(val) : undefined)),
  domain: z.string().optional(),
  eventId: z
    .string()
    .optional()
    .transform((val) => (val != undefined ? val.split(',') : undefined)),
  published: z
    .string()
    .optional()
    .transform((val) =>
      val === undefined ? undefined : val === 'true' ? true : false,
    ),
});
export class CreateDto extends createZodDto(Central) {}
