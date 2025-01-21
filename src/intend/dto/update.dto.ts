import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const bodyToUpdateIntend = z.strictObject({
    id: z.string(),
    status: z.string(),
    redirectUrl: z.string(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
  });
  export class Update_Dto extends createZodDto(bodyToUpdateIntend) {}