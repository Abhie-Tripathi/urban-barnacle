import { UnlockType } from "@prisma/client";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const userSchema = z.strictObject({
    unmask: z.string().optional(),
    target: z.nativeEnum(UnlockType).optional(),
    source: z.enum(['eventPage', 'companyPage', 'prospectUserPage']).optional(),
    targetId: z.string().optional()
}).refine(data => {
    if (data.unmask) {
        return data.target !== undefined && data.source !== undefined;
    }
    return true;
}, {
    message: "Target and Source are required if unmask is present",
    path: ["unmask"]
});

export class UserSchemaDto extends createZodDto(userSchema) { }

export const pocUnmaskSchemaMandate = z.strictObject({
    unmask: z.string(),
    target: z.nativeEnum(UnlockType),
    source: z.enum(['eventPage', 'companyPage', 'prospectUserPage']),
    targetId: z.string().optional()
})

export class PocUnmaskDto extends createZodDto(pocUnmaskSchemaMandate) { }