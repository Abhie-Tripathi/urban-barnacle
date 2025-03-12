import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Industries, SubIndustries } from '../../../utils/types';
import { AccessSourceEntity } from '@prisma/client';

const SignInSchema = z.object({
  email: z.string().email(),
});

export class SignInDto extends createZodDto(SignInSchema) { }

export const SignUpSchema = z.strictObject({
  industry: z
    .string()
    .refine((industry) => {
      if (process.env.BACKEND === 'geo') {
        return Object.values(Industries.geo).includes(industry);
      }
      return Object.values(Industries.gtm).includes(industry);
    })
    .optional(),
  subIndustry: z
    .string()
    .refine((subIndustry) => {
      if (process.env.BACKEND === 'geo') {
        return Object.values(SubIndustries).includes(subIndustry);
      }
      return true;
    })
    .optional(),
  category: z.string().optional(),
  email: z.string().email(),
});

export class SignUpDto extends createZodDto(SignUpSchema) { }

const VerifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string(),
});

export class VerifyOtpDto extends createZodDto(VerifyOtpSchema) { }

const VerifyAccessSchema = VerifyOtpSchema.extend({
  target: z
    .string()
    .refine((val) => val.toUpperCase() in AccessSourceEntity, {
      message: 'Invalid target',
    })
    .transform((val) => val.toUpperCase() as AccessSourceEntity),
  targetId: z.string().uuid().optional(),
});

export class VerifyAccessDto extends createZodDto(VerifyAccessSchema) { }


const authenticatSchema = z.strictObject({
  token: z.string(),
  userId: z.number()
});
export class AuthenticatDto extends createZodDto(authenticatSchema) { }