import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const createInternd = z.strictObject({
    email: z.string(),
    firstname: z.string(),
    lastname: z.string(),
    eventId: z.string(),
    interest: z.string(),
    note: z.string().optional(),
    // source: z.string(),
    sourceId: z.string().optional(),
    redirectUrl: z.string(),
    status: z.string().optional(),
  });
  export class CreateIntendDto extends createZodDto(createInternd) {}
  