import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCommentDto, GetCommentsDto, UpdateCommentDto } from './dto';

@Injectable()
export class CommentDataService {
  constructor(private readonly prisma: PrismaService) {}

  async createComment(data: CreateCommentDto) {
    const comment = await this.prisma.comment.create({
      data,
    });
    return comment;
  }

  async updateComment(data: UpdateCommentDto) {
    const comment = await this.prisma.comment.update({
      where: { id: data.id },
      data,
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
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
    return comments;
  }
}
