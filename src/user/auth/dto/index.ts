import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Industries, SubIndustries } from '../../../utils/types';

const SignInSchema = z.object({
  email: z.string().email(),
});

export class SignInDto extends createZodDto(SignInSchema) {}

export const SignUpSchema = z.strictObject({
  industry: z
    .string()
    .refine((industry) => {
      if (process.env.BACKEND === 'eventeli') {
        return Object.values(Industries.eventeli).includes(industry);
      }
      return Object.values(Industries.eventgtm).includes(industry);
    })
    .optional(),
  subIndustry: z
    .string()
    .refine((subIndustry) => {
      if (process.env.BACKEND === 'eventeli') {
        return Object.values(SubIndustries).includes(subIndustry);
      }
      return true;
    })
    .optional(),
  category: z.string().optional(),
  email: z.string().email(),
});

export class SignUpDto extends createZodDto(SignUpSchema) {}

const VerifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string(),
});

export class VerifyOtpDto extends createZodDto(VerifyOtpSchema) {}

export const UserResponseSchema = z.object({
  userData: z.object({
    firstname: z.string(),
    email: z.string(),
    id: z.string().uuid(),
    role: z.string(),
    imageUrl: z.any().optional(),
    accountId: z.string().uuid(),
  }),
  token: z.string(),
});
