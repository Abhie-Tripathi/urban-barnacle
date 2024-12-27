import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const otpDto = z.strictObject({
  otp: z.number(),
  email: z.string().email(),
});
export class OtpDto extends createZodDto(otpDto) {}

const otpCreateDto = z.strictObject({
  email: z.string().email(),
});
export class OtpCreateDto extends createZodDto(otpCreateDto) {}
