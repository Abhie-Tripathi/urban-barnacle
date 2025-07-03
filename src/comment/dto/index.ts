import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CommentType, CommentSourceModule, Interest } from '@prisma/client';
import { LimitDto, LimitSchema } from 'src/global_dto';

const CreateCommentHttpSchema = z.object({
  content: z
    .string()
    .min(1, 'Content can not be empty')
    .max(255, 'Content can not be more than 255 characters')
    .optional(),
  commentType: z.nativeEnum(CommentType),
  interest: z
    .nativeEnum(Interest)
    .refine(
      (data) => data !== Interest.BOOKMARK && data !== Interest.ORGANIZE,
      'Invalid interest',
    )
    .optional(),
  sourceModule: z.nativeEnum(CommentSourceModule),
  sourceId: z.string(),
  parentCommentId: z.string().uuid().optional(),
  interestedUserId: z.string().uuid().optional(),
});

export class CreateCommentHttpDto extends createZodDto(
  CreateCommentHttpSchema,
) { }

const CreateCommentSchema = CreateCommentHttpSchema.extend({
  userId: z.string().uuid(),
  accountId: z.string().uuid(),
});

export class CreateCommentDto extends createZodDto(CreateCommentSchema) { }

const UpdateCommentHttpSchema = z.object({
  content: z.string().min(3).max(255).optional(),
  commentType: z.nativeEnum(CommentType).optional(),
  interestedUserId: z.string().uuid().optional(),
  interest: z
    .nativeEnum(Interest)
    .refine((data) => data !== Interest.BOOKMARK)
    .optional(),
});

export class UpdateCommentHttpDto extends createZodDto(
  UpdateCommentHttpSchema,
) { }

const UpdateCommentSchema = UpdateCommentHttpSchema.extend({
  id: z.string().uuid(),
  content: z.string().min(3).max(255).optional(),
  commentType: z.nativeEnum(CommentType).optional(),
  deleted: z.boolean().optional(),
  attachments: z.array(z.string()).optional()
});

export class UpdateCommentDto extends createZodDto(UpdateCommentSchema) { }

const GetCommentsSchema = LimitSchema.extend({
  id: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  sourceModule: z.array(z.nativeEnum(CommentSourceModule)).optional(),
  sourceId: z.string().optional(),
  parentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});

export class GetCommentsDto extends createZodDto(GetCommentsSchema) { }

const GetCommentCountSchema = GetCommentsSchema.omit({
  limit: true,
  offset: true,
});

export class GetCommentCountDto extends createZodDto(GetCommentCountSchema) { }
