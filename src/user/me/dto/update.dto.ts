import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateMeSchema = z.strictObject({
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  industry: z.string().optional(),
  category: z.string().optional(),
  subIndustry: z.string().optional(),
  phoneNumber: z.string().optional(),
  removePicture: z.string().optional(),
});
export class UpdateMeDto extends createZodDto(UpdateMeSchema) { }
