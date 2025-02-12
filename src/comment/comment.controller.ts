import {
  Body,
  Controller,
  Delete,
  HttpException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { TCachedUser } from 'src/utils/types';
import { GetUser } from 'src/user/decorator';
import { CreateCommentHttpDto, UpdateCommentHttpDto } from './dto';
import { AuthGuard } from 'src/user/auth/guard';
import { FileInterceptor } from '@nest-lab/fastify-multer';

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async createComment(
    @Body() data: CreateCommentHttpDto,
    @GetUser() user: TCachedUser,
    @UploadedFile() file: File,
  ) {
    try {
      const comment = await this.commentService.createComment(user, data);
      return { data: comment };
    } catch (error) {
      return { error: error };
    }
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async updateComment(
    @Param('id') id: string,
    @Body() data: UpdateCommentHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    return this.commentService.updateComment(user, { ...data, id });
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteComment(@Param('id') id: string, @GetUser() user: TCachedUser) {
    return this.commentService.deleteComment(user, { id });
  }
}
