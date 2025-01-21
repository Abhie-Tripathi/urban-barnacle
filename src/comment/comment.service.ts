import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CommentDataService } from './comment.data.service';
import { TCachedUser } from 'src/utils/types';
import {
  CreateCommentDto,
  CreateCommentHttpDto,
  GetCommentsDto,
  UpdateCommentDto,
} from './dto';
import { AccessService } from 'src/access/access.service';
import { IntentService } from 'src/intent/intent.service';
import { EnquiryService } from 'src/enquiry/enquiry.service';
import { IntentDataService } from 'src/intent/intent.data.service';
import { InterestSourceModule } from '@prisma/client';

@Injectable()
export class CommentService {
  constructor(
    private readonly commentDataService: CommentDataService,
    private readonly accessService: AccessService,
    private readonly intentDataService: IntentDataService,
    private readonly enquiryService: EnquiryService,
  ) {}

  async createComment(user: TCachedUser, data: CreateCommentHttpDto) {
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
      return comment;
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
        let enquiry = (
          await this.enquiryService.getEnquiries({
            ids: [data.sourceId],
            accountId: user.accountId,
            limit: 1,
            offset: 0,
          })
        )[0];
        if (!enquiry) {
          throw new HttpException('Enquiry not found', HttpStatus.NOT_FOUND);
        }
        const userInterestParams = {
          sourceModule: InterestSourceModule.COMMENT,
          interest: data.interest,
          accountId: user.accountId,
          enquiry: enquiry.id,
          eventId: enquiry.eventId,
          interestedUserId: data.interestedUserId,
        };
        if (data.commentType === 'RECOMMENDATION' && data.interestedUserId) {
          userInterestParams['recommendedBy'] = user.id;
        }
        await this.intentDataService.createUserEventInterest(
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
      return comment;
    }
    throw new HttpException('Invalid source module', 400);
  }

  async getComments(user: TCachedUser, data: GetCommentsDto) {
    const comments = await this.commentDataService.getComments(data);
    return comments;
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
        const enquiry = await this.enquiryService.getEnquiries({
          ids: [comment[0].sourceId],
          accountId: user.accountId,
          limit: 1,
          offset: 0,
        });
        if (enquiry.length === 0) {
          throw new HttpException('Enquiry not found', HttpStatus.NOT_FOUND);
        }
        await this.intentDataService.createUserEventInterest({
          sourceModule: InterestSourceModule.COMMENT,
          interest: data.interest,
          accountId: user.accountId,
          enquiryId: enquiry[0].id,
          eventId: enquiry[0].eventId,
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
}
