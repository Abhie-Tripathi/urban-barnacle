import { TrackerType } from "@prisma/client";
import { createZodDto } from "nestjs-zod";
import { LimitSchema } from "src/global_dto";
import { z } from "zod";

const presetSchema = LimitSchema.extend({
  countryIds: z.string().optional().transform(val => val ? val.split(",") : undefined),
  categorySlugs: z.string().optional().transform(val => val ? val.split(",") : undefined),
  deleted: z.string().optional(),
  keywords: z.string().optional(),
  totalEvent: z.string().optional().transform(val => {
    if (!val) return undefined;
    const [start, end] = val.split("-").map(Number);
    return isNaN(start) || isNaN(end) ? undefined : { start, end };
  }),
  newEventCount: z.string().optional().transform(val => {
    if (!val) return undefined;
    const [start, end] = val.split("-").map(Number);
    return isNaN(start) || isNaN(end) ? undefined : { start, end };
  }),
  trackerType: z.string().optional().transform(val => val ? val.split(",") as TrackerType[] : undefined),
  rank: z.string().optional().transform(val => {
    if (!val) return undefined;
    const [start, end] = val.split("-").map(Number);
    return isNaN(start) || isNaN(end) ? undefined : { start, end };
  }),
  sortBy: z.enum(['totalEvent', 'newEventCount']).default('totalEvent'),
  sortAs: z.enum(['asc', 'desc']).default('desc')
});

export class PresetDto extends createZodDto(presetSchema) { }


// const demoSchema = z.strictObject({
//     body: z.string(),
//     subject: z.string()
// })
// export class DemoDto extends createZodDto(demoSchema) { }

export const demoContactSchema = z.strictObject({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  companyName: z.string(),
  jobTitle: z.string(),
  phoneNumber: z.string(),
  subscribe: z.enum(['true', 'false']).default('false')
})
export class DemoContactDto extends createZodDto(demoContactSchema) { }
export const contactUsSchema = demoContactSchema.omit({
  companyName: true,
  jobTitle: true,
  phoneNumber: true,
  subscribe: true,
}).extend({ message: z.string() })
export class ContactUsDto extends createZodDto(contactUsSchema) { }