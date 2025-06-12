import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateCommentDto,
  GetCommentCountDto,
  GetCommentsDto,
  UpdateCommentDto,
} from './dto';
import { File } from '@nest-lab/fastify-multer';
import { FileCreationService } from 'src/shared/file-creation.service';
import { TCachedUser } from 'src/utils/types';

@Injectable()
export class CommentDataService {
  constructor(private readonly prisma: PrismaService,
    private readonly fileService: FileCreationService,
  ) { }

  async createComment(data: CreateCommentDto, files?: File[]) {
    // data.
    const comment = await this.prisma.comment.create({
      data,
      include: {
        parentComment: {
          include: {
            user: true,
          },
        },
        user: true,
      },
    });
    if (files && files.length > 0) {
      const attachments = await Promise.all(
        files.map((val) => this.fileService.createFile('', val, data.userId, 'IMAGE', 'COMMENT', comment.id))
      );
      comment.attachments = attachments.map(attachment => attachment.fileData?.fileUrl || '');
      await this.updateComment({ id: comment.id, attachments: attachments.map(attachment => attachment.fileData?.fileUrl || '') })
    }
    return comment;
  }

  async updateComment(data: UpdateCommentDto) {
    const comment = await this.prisma.comment.update({
      where: { id: data.id },
      data,
      include: {
        parentComment: {
          include: {
            user: true,
          },
        },
        user: true,
      },
    });
    return comment;
  }

  async getComments(data: GetCommentsDto) {
    const { limit, offset, ...where } = data;
    const comments = await this.prisma.comment.findMany({
      where: {
        ...where,
        deleted: false,
      },
      include: {
        parentComment: {
          include: {
            user: true,
          },
        },
        user: true,
      },
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
    return comments;
  }

  async getCommentCount(data: GetCommentCountDto) {
    const commentCount = await this.prisma.comment.count({
      where: {
        ...data,
        deleted: false,
      },
    });
    return commentCount;
  }
  async getCommentById(id: string, user: TCachedUser) {
    const comment = await this.prisma.comment.findUnique({
      where: {
        id: id,
        deleted: false,
        accountId: user.accountId
      },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            imageUrl: true,
          }
        }
      }
    });
    if (!comment) {
      throw new HttpException("Comment not found", HttpStatus.NOT_FOUND);
    }
    return comment;
  }
}
