import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const CommentUserSchema = z.object({
  id: z.string(),
  firstname: z.string().nullable(),
  lastname: z.string().nullable(),
  email: z.string(),
  imageUrl: z.string().nullable(),
});

const CommentResponseSchema = z.object({
  id: z.string(),
  content: z.string().nullable(),
  commentType: z.string(),
  // userId: z.string(),
  accountId: z.string(),
  sourceModule: z.string(),
  sourceId: z.string(),
  // parentCommentId: z.string().nullable(),
  totalLikes: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  userUpvoted: z.boolean().optional(),
  // user: CommentUserSchema,
  user: CommentUserSchema,
});

const CommentWithParentSchema = CommentResponseSchema.extend({
  parentComment: CommentResponseSchema.nullable(),
});

export const CommentsResponseSchema = z.object({
  count: z.number(),
  comments: z.array(CommentWithParentSchema),
});

export class CommentResponseDto extends createZodDto(CommentResponseSchema) {}
