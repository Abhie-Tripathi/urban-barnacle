import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const eventDto = z.strictObject({
  name: z.string(),
  data: z.string(),
  logoUrl: z.string().optional(),
  // interest: z.string().optional(),
  // sourceId: z.string().optional(),
  note: z.string().optional(),
  type: z.string().optional(),
  widgetId: z.string().optional(),
  eventId: z.string().optional(),
  capacity: z.string().optional(),
  waitlisting: z.string().optional(),
  registration: z.string().optional(),
  approval: z.string().optional(),
});

export class CreateEventDto extends createZodDto(eventDto) {}
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
});

export class UpdateEventDto extends createZodDto(UpdateeventDto) {}
export const EventDetailsSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  gmt_time: z.string(),
  location_city: z.string(),
  location_country: z.string(),
  location_state: z.string().optional(),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  description: z.string(),
  logoUrl: z.string().nullable().optional(),
  venue_name: z.string().optional(),
  venue_address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  format: z.string(),
  booth_number: z.string().optional(),
  participationType: z.string().optional(),
  event_type: z.string(),
  category: z.string().optional(),
  tags: z.string().optional(),
  customizationData: z.string().optional(),
  parentData: z.string().optional(),
  maxCapacity: z.number().optional(),
  virtualLink: z.string().optional(),
  posterLink: z.string().optional(),
});
export const eventspeakerDto = z.strictObject({
  eventId: z.string(),
  data: z.string(),
  isExhibitor: z.string().optional(),
});

export class EventSpeakerDto extends createZodDto(eventspeakerDto) {}
