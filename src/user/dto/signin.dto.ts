import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const signInDto = z.strictObject({
  email: z.string(),
  otp: z.number(),
});
export class SignInDto extends createZodDto(signInDto) {}
export const UserResponseSchema = z.object({
    userData: z.object({
      firstname: z.string(),
      email: z.string(),
      id: z.string(),
      role: z.string(),
      imageUrl: z.any().optional(),
      accountId: z.string(),
    }),
    token: z.string(),
  });