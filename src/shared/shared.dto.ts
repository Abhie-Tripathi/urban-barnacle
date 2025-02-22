import { createZodDto } from "nestjs-zod";
import { LimitSchema } from "src/global_dto";
import { z } from "zod";

const prospectSchema = LimitSchema.extend({
    // companyCategoryIds: z.string().optional(),
    companyLocationIds: z.string().optional(),
    communitySize: z.string().optional(),
    companyId: z.string().optional(),
    companyType: z.enum(['organizer', 'exhibitor', 'other']).optional(),
    eventProductIds: z.string().optional(),
    eventLocationIds: z.string().optional(),
    eventCategoryIds: z.string().optional(),
    eventFollowers: z.string().optional(),
    eventParticipationType: z
        .string()
        .refine((val) =>
            val
                .split(',')
                .every((v) =>
                    ['organizer', 'exhibitor', 'visitor', 'sponsor'].includes(v.trim()),
                ),
        )
        .optional(),
    userNames: z.string().optional(),
    userJobTitle: z.string().optional(),
    userSocialLink: z.string().optional(),
});

export class ProspectSchemaDto extends createZodDto(prospectSchema) { }