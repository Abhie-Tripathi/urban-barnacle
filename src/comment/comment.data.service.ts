import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateCommentDto,
  GetCommentCountDto,
  GetCommentsDto,
  UpdateCommentDto,
} from './dto';

@Injectable()
export class CommentDataService {
  constructor(private readonly prisma: PrismaService) {}

  async createComment(data: CreateCommentDto) {
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
}
