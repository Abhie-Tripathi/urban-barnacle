import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CommentDataService } from './comment.data.service';
import { TCachedUser } from 'src/utils/types';
import {
  CreateCommentHttpDto,
  GetCommentCountDto,
  GetCommentsDto,
  UpdateCommentDto,
} from './dto';
import { AccessService } from 'src/access/access.service';
import { IntentService } from 'src/intent/intent.service';
import { IntentTargetModule, InterestSourceModule } from '@prisma/client';
import { CommentWithParentSchema } from './dto/response';
import { CreateIntentHttpDto } from 'src/intent/dto';

@Injectable()
export class CommentService {
  constructor(
    private readonly commentDataService: CommentDataService,
    private readonly accessService: AccessService,
    private readonly intentService: IntentService,
  ) {}

  async createComment(user: TCachedUser, data: CreateCommentHttpDto) {
    if (data.parentCommentId) {
      const parentComment = await this.commentDataService.getComments({
        id: data.parentCommentId,
        sourceModule: data.sourceModule,
        sourceId: data.sourceId,
        accountId: user.accountId,
        limit: 1,
        offset: 0,
      });
      if (parentComment.length === 0) {
        throw new HttpException(
          'Parent comment not found',
          HttpStatus.NOT_FOUND,
        );
      }
    }
    if (data.sourceModule === 'TRACKER') {
      const [hasAccess, result] = await this.accessService.hasAccess({
        sourceEntity: 'TRACKER',
        sourceEntityId: data.sourceId,
        accountId: user.accountId,
        accessReceiverId: user.id,
        accessTypes: ['USER', 'ADMIN', 'SUPER_ADMIN'],
        limit: 1,
        offset: 0,
      });
      if (!hasAccess) {
        throw new HttpException(result.message, result.status);
      }
      const comment = await this.commentDataService.createComment({
        ...data,
        accountId: user.accountId,
        userId: user.id,
      });
      return CommentWithParentSchema.parse(comment);
    } else if (
      data.sourceModule === 'COORDINATE' ||
      data.sourceModule === 'OUTREACH'
    ) {
      const comment = await this.commentDataService.createComment({
        ...data,
        accountId: user.accountId,
        userId: user.id,
      });
      if (
        data.sourceModule === 'COORDINATE' &&
        ['INTEREST', 'RECOMMEND'].includes(data.commentType) &&
        data.interest &&
        data.interestedUserId
      ) {
        // let enquiry = (
        //   await this.enquiryService.getEnquiries({
        //     ids: [data.sourceId],
        //     accountId: user.accountId,
        //     limit: 1,
        //     offset: 0,
        //   })
        // )[0];
        // if (!enquiry) {
        //   throw new HttpException('Enquiry not found', HttpStatus.NOT_FOUND);
        // }
        const userInterestParams = {
          sourceModule: InterestSourceModule.COMMENT,
          interest: data.interest,
          accountId: user.accountId,
          enquiry: data.sourceId,
          // eventId: enquiry.eventId,
          interestedUserId: data.interestedUserId,
        };
        if (data.commentType === 'RECOMMENDATION' && data.interestedUserId) {
          userInterestParams['recommendedBy'] = user.id;
        }
        await this.intentService.createUserEventInterest(
          user,
          userInterestParams,
        );
      } else if (
        data.sourceModule === 'COORDINATE' &&
        ['INTEREST', 'RECOMMEND'].includes(data.commentType)
      ) {
        if (!data.interest) {
          throw new HttpException(
            'Interest is required',
            HttpStatus.BAD_REQUEST,
          );
        }
        if (!data.interestedUserId) {
          throw new HttpException(
            'Interested user is required',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      return CommentWithParentSchema.parse(comment);
    }
    throw new HttpException('Invalid source module', 400);
  }

  async getComments(data: GetCommentsDto, user?: TCachedUser) {
    const { limit, offset, ...rest } = data;
    const [comments, commentsCount] = await Promise.all([
      this.commentDataService.getComments({ ...rest, limit, offset }),
      this.commentDataService.getCommentCount(rest),
    ]);
    const commentsWithUserUpvoted = { count: commentsCount, comments };
    if (user) {
      commentsWithUserUpvoted.comments = await Promise.all(
        comments.map(async (comment) => {
          const userUpvoted = await this.intentService.checkUserUpvote({
            userId: user.id,
            targetModule: IntentTargetModule.COMMENT,
            targetId: comment.id,
            accountId: user.accountId,
          });
          return {
            ...comment,
            userUpvoted,
          };
        }),
      );
    }
    return commentsWithUserUpvoted;
  }

  async getCommentCount(data: GetCommentCountDto) {
    const commentCount = await this.commentDataService.getCommentCount(data);
    return commentCount;
  }

  async updateComment(user: TCachedUser, data: UpdateCommentDto) {
    const comment = await this.commentDataService.getComments({
      id: data.id,
      limit: 1,
      offset: 0,
    });
    if (comment.length === 0) {
      throw new HttpException('Comment not found', HttpStatus.NOT_FOUND);
    }
    if (comment[0].userId !== user.id) {
      throw new HttpException(
        'You are not authorized to update this comment',
        HttpStatus.FORBIDDEN,
      );
    }
    const updatedComment = await this.commentDataService.updateComment(data);
    if (updatedComment.sourceModule === 'COORDINATE') {
      if (data.interest && data.interestedUserId) {
        await this.intentService.createUserEventInterest(user, {
          sourceModule: InterestSourceModule.COMMENT,
          interest: data.interest,
          accountId: user.accountId,
          enquiryId: comment[0].sourceId,
          interestedUserId: data.interestedUserId,
        });
      }
    }
    return updatedComment;
  }

  async deleteComment(user: TCachedUser, data: UpdateCommentDto) {
    const comment = await this.commentDataService.updateComment({
      id: data.id,
      deleted: true,
    });
    return comment;
  }

  async createCommentUpvote(user: TCachedUser, data: CreateIntentHttpDto) {
    const comment = await this.commentDataService.getComments({
      id: data.targetId,
      limit: 1,
      offset: 0,
    });
    if (comment.length === 0) {
      throw new HttpException('Comment not found', HttpStatus.NOT_FOUND);
    }
    const upvote = await this.intentService.createUpvote(user, 'UPVOTE', {
      ...data,
      targetModule: IntentTargetModule.COMMENT,
      targetId: comment[0].id,
    });
    return upvote;
  }

  async deleteCommentUpvote(user: TCachedUser, id: string) {
    const comment = await this.commentDataService.getComments({
      id: id,
      limit: 1,
      offset: 0,
    });
    if (comment.length === 0) {
      throw new HttpException('Comment not found', HttpStatus.NOT_FOUND);
    }
    const upvote = await this.intentService.deleteUpvote(user, {
      targetModule: IntentTargetModule.COMMENT,
      targetId: comment[0].id,
    });
    return upvote;
  }
}
