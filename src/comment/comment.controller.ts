import {
  Body,
  Controller,
  Delete,
  HttpException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { TCachedUser } from 'src/utils/types';
import { GetUser } from 'src/user/decorator';
import { CreateCommentHttpDto, UpdateCommentHttpDto } from './dto';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  async createComment(
    @Body() data: CreateCommentHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const comment = await this.commentService.createComment(user, data);
      return { data: comment };
    } catch (error) {
      return { error: new HttpException(error.message, error.status) };
    }
  }

  @Patch(':id')
  async updateComment(
    @Param('id') id: string,
    @Body() data: UpdateCommentHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    return this.commentService.updateComment(user, { ...data, id });
  }

  @Delete(':id')
  async deleteComment(@Param('id') id: string, @GetUser() user: TCachedUser) {
    return this.commentService.deleteComment(user, { id });
  }
}
