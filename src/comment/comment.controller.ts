import {
  Body,
  Controller,
  Delete,
  HttpException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { TCachedUser } from 'src/utils/types';
import { GetUser } from 'src/user/decorator';
import { CreateCommentHttpDto, UpdateCommentHttpDto } from './dto';
import { AuthGuard } from 'src/user/auth/guard';
import { File, FileInterceptor, FilesInterceptor } from '@nest-lab/fastify-multer';
import { CreateIntentHttpDto } from 'src/intent/dto';
import { IntentTargetModule } from '@prisma/client';

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) { }
  @UseInterceptors(FilesInterceptor('files'))
  @Post()
  @UseGuards(AuthGuard)
  async createComment(
    @Body() data: CreateCommentHttpDto,
    @GetUser() user: TCachedUser,
    @UploadedFiles() files: File[],
  ) {
    try {
      const comment = await this.commentService.createComment(user, data, files);
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

  @UseGuards(AuthGuard)
  @Post(':id/upvote')
  async createUpvote(@Param('id') id: string, @GetUser() user: TCachedUser) {
    try {
      const upvote = await this.commentService.createCommentUpvote(user, {
        targetId: id,
        targetModule: IntentTargetModule.COMMENT,
      });
      return {
        data: upvote,
      };
    } catch (error) {
      return {
        error: error,
      };
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':id/upvote')
  async deleteUpvote(@Param('id') id: string, @GetUser() user: TCachedUser) {
    try {
      const upvote = await this.commentService.deleteCommentUpvote(user, id);
      return {
        data: upvote.data,
      };
    } catch (error) {
      return {
        error: error,
      };
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteComment(@Param('id') id: string, @GetUser() user: TCachedUser) {
    return this.commentService.deleteComment(user, { id });
  }
}
