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
    eventCategorySlugs: z.string().optional(),
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
    userId: z.string().optional(),
    userRoleIds: z.string().optional(),
    userDepartmentIds: z.string().optional(),
    userDesignationIds: z.string().optional(),
    eventIds: z.string().optional(),
}).refine((data) => {
    const { userId, companyId, ...rest } = data;
    if (userId || companyId) {
        const allowedKeys = ['limit', 'offset', 'userId', 'companyId'];
        return Object.keys(rest).every((key) => allowedKeys.includes(key));
    }

    return true;
}, {
    message: 'When id is provided, only limit and offset are allowed.',
});;

export class ProspectSchemaDto extends createZodDto(prospectSchema) { }