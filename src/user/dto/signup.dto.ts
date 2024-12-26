import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
enum Industries {
  others = 'others',
  media_agency = 'media_agency',
  research = 'research',
  industry_partners = 'industry_partners',
  event_participant = 'event_participant',
}
const signUpDto = z.strictObject({
  industry: z.nativeEnum(Industries).optional(),
  category: z.string().optional(),
  email: z.string().email(),
});
export class SignUpDto extends createZodDto(signUpDto) {}
