import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const userProfileDto = z.strictObject({
  name: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  phoneNumber: z.string().optional(),
  removePicture: z.string().optional(),
});
export class UpdateProfileDto extends createZodDto(userProfileDto) {}
