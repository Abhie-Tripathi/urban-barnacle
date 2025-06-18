import { UserSource } from "@prisma/client";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const interestTransform: Record<string, string> = {
  ATTENDEE: 'ATTEND',
  SPEAKER: 'SPEAK',
  EXHIBITOR: "EXHIBIT",
  ORGANISER: "SPONSOR"
};

const createInternd = z.strictObject({
  email: z.string().email(),
  firstname: z.string(),
  lastname: z.string(),
  eventId: z.string(),
  interest: z.string()
    .refine(val => val in interestTransform, {
      message: "Invalid interest value"
    })
    .transform(val => interestTransform[val]),
  note: z.string().optional(),
  sourceId: z.string().optional(),
  redirectUrl: z.string(),
  status: z.string().optional(),
  source: z.string().transform(val => {
    if (val === 'eventgeni') {
      return UserSource.PROMOTE_EVENT;
    }
    return val as UserSource;
  })
});

export class CreateIntendDto extends createZodDto(createInternd) { }
