import { UserSource } from "@prisma/client";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const createInternd = z.strictObject({
  email: z.string().email(),
  firstname: z.string(),
  lastname: z.string(),
  eventId: z.string(),
  interest: z.string(),
  note: z.string().optional(),
  // source: z.string(),
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
