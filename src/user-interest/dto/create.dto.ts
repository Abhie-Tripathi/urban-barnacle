import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const enquirycreateDto = z.strictObject({
  eventId: z.string(),
});
export class EnquirycreateDto extends createZodDto(enquirycreateDto) {}
