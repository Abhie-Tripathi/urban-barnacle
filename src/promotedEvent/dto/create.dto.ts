import { EventSourceModule, EventType, Interest } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { EntryType } from 'src/events/dto';
import { z } from 'zod';


export enum PromoteEventType {
  Tradeshow,
  Conference,
  Workshop,
  Social,
  Business,
  Unattented
}
enum PromoteEventFormat {
  "In-person",
  Virtual,
  Hybrid
}
export const EventDetailsSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  gmt_time: z.string().optional(),
  location_city_id: z.string().optional(),
  location_city: z.string().optional(),
  location_country: z.string().optional(),
  location_country_id: z.string().optional(),
  location_country_iso_code: z.string().optional(),
  location_state: z.string().optional(),
  location_state_id: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  venue_name: z.string().optional(),
  venue_address: z.string().optional(),
  venue_latitude: z.number().optional(),
  venue_longitude: z.number().optional(),
  venue_id: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  format: z.string().refine((val) => val.split(',').every((item) => item in PromoteEventFormat)),
  booth_number: z.string().optional(),
  participationType: z.string().optional(),
  event_type: z.string().refine((val) => val.split(',').every((item) => item in PromoteEventType)),
  category: z.string().optional(),
  tags: z.string().optional(),
  customizationData: z.string().optional(),
  parentData: z.string().optional(),
  maxCapacity: z.number().optional(),
  virtualLink: z.string().optional(),
  posterLink: z.string().optional(),
}).refine((data) => {
  if (data.location_city_id || data.location_country_id) {
    return data.location_city && data.location_country && data.location_country_iso_code;
  }
  return true;
}, {
  message: 'location_city, location_country, and location_country_iso_code are required when location_city_id or location_country_id is present',
  path: ['location_city', 'location_country', 'location_country_iso_code'],
}).refine((data) => {
  if (data.venue_id) {
    return data.venue_name;
  }
  return true;
}, {
  message: 'venue_name is required when venue_id is present',
  path: ['venue_name'],
}).refine(data => {
  if (data.event_type) {
    return true;
  }
}, {
  message: 'event_type is required when venue_id is present',
  path: ['event_type'],
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date);
  }
  return true;
}, {
  message: 'start_date must be less than or equal to end_date',
  path: ['start_date'],
});
export const eventDto = z.strictObject({
  name: z.string(),
  data: z.string(),
  logoUrl: z.string().optional(),
  // interest: z.string().optional(),
  // sourceId: z.string().optional(),
  referenceId: z.string().optional(),
  sourceModule: z.nativeEnum(EventSourceModule),
  note: z.string().optional(),
  type: z.nativeEnum(EventType).default('PARENT'),
  widgetId: z.string().optional(),
  eventId: z.string().optional(),
  capacity: z.string().optional(),
  waitlisting: z.string().optional(),
  registration: z.string().optional(),
  approval: z.string().optional(),
  interest: z.nativeEnum(Interest).optional()
}).superRefine((val, ctx) => {
  if (!val.data) return;

  try {
    const parsed = JSON.parse(val.data);
    const result = EventDetailsSchema.safeParse(parsed);
    if (!result.success) {
      result.error.errors.forEach(err => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['data', ...(err.path ?? [])],
          message: err.message,
        });
      });
    }
  } catch (e) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['data'],
      message: 'Invalid JSON format',
    });
  }
});

export class CreateEventDto extends createZodDto(eventDto) { }
export const UpdateeventDto = z.strictObject({
  id: z.string(),
  name: z.string().optional(),
  data: z.string().optional(),
  logoUrl: z.string().optional(),
  interest: z.string().optional(),
  sourceId: z.string().optional(),
  note: z.string().optional(),
  capacity: z.string().optional(),
  waitlisting: z.string().optional(),
  registration: z.string().optional(),
  approval: z.string().optional(),
  maxCapacity: z.string().optional(),
}).superRefine((val, ctx) => {
  if (!val.data) return;

  try {
    const parsed = JSON.parse(val.data);
    const result = EventDetailsSchema.safeParse(parsed);
    if (!result.success) {
      result.error.errors.forEach(err => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['data', ...(err.path ?? [])],
          message: err.message,
        });
      });
    }
  } catch (e) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['data'],
      message: 'Invalid JSON format',
    });
  }
});;

export class UpdateEventDto extends createZodDto(UpdateeventDto) { }

export const eventspeakerDto = z.strictObject({
  eventId: z.string(),
  data: z.string(),
  isExhibitor: z.string().optional(),
});

export class EventSpeakerDto extends createZodDto(eventspeakerDto) { }
