import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CommentType, CommentSourceModule, Interest } from '@prisma/client';
import { LimitDto, LimitSchema } from 'src/global_dto';
const companyEventSchema = LimitSchema.extend({
  groupBy: z.enum(['country']).optional(),
  eventOf: z.enum(['upcomming', 'past']).optional(),
})
  .refine((data) => data.groupBy || data.eventOf, {
    message: "Either 'groupBy' or 'eventOf' must be provided",
    path: [],
  })
  .refine(
    (val) => {
      if (val && val.limit && val.limit <= 100) {
        return true;
      }
      return false;
    },
    {
      message: 'Limit must be a number less than or equal to 100',
      path: ['limit'],
    },
  );

export class CompanyEventDto extends createZodDto(companyEventSchema) {}
