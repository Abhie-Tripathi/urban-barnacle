import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { TCachedUser } from 'src/utils/types';
import {
  CreateEnquiryDto,
  GetEnquiriesDto,
  GetEnquiryCountDto,
  SetEnquiryOwnerHttpDto,
  UpdateEnquiryDto,
} from './dto';
import { EnquiryDataService } from './enquiry.data.service';
import { EnquiryResponseSchema } from './dto/response';
import { IntentDataService } from 'src/intent/intent.data.service';
import { UserInterestsGroupBy } from 'src/intent/dto/userEventInterest.dto';
import { EnquiryActivityGroupBy } from 'src/intent/dto/enquiryActivity.dto';
import { UserDataService } from 'src/user/user.data.service';
import { getNameFromEmail } from 'src/utils';
import { GetCommentsDto } from 'src/comment/dto';
import {
  CommentSourceModule,
  EnquiryActivity,
  EnquiryActivityType,
  IntentTargetModule,
  IntentType,
  Interest,
  Prisma,
  User,
  UserEventInterest,
} from '@prisma/client';
import { CommentsResponseSchema } from 'src/comment/dto/response';
import { GetIntentDto } from 'src/intent/dto';

@Injectable()
export class EnquiryService {
  constructor(
    private readonly enquiryDataService: EnquiryDataService,
    private readonly intentDataService: IntentDataService,
    private readonly userDataService: UserDataService,
  ) { }

  async createEnquiry(user: TCachedUser, data: CreateEnquiryDto) {
    const enquiry = await this.enquiryDataService.createEnquiry(data);
    return enquiry;
  }

  async getEnquiries(data: GetEnquiriesDto) {
    const enquiries = await this.enquiryDataService.getEnquiries(data);
    return enquiries;
  }

  async getEnquiry(user: TCachedUser, id: string) {
    const enquiries = await this.enquiryDataService.getEnquiries({
      ids: [id],
      accountId: user.accountId,
      limit: 1,
      offset: 0,
    });
    if (enquiries.length === 0) {
      throw new HttpException('Enquiry not found', HttpStatus.NOT_FOUND);
    }
    const enquiry = enquiries[0];
    const [interestedCount, activityCount, followerCount, myActivity] =
      await Promise.all([
        this.intentDataService.getUserEventInterestCount({
          accountId: user.accountId,
          enquiryId: enquiry.id,
          groupBy: UserInterestsGroupBy.interests,
          interest: ['ATTEND', 'SPEAK', 'EXHIBIT', 'SPONSOR'],
        }),
        this.intentDataService.getEnquiryActivityCount({
          accountId: user.accountId,
          enquiryId: enquiry.id,
          groupBy: EnquiryActivityGroupBy.activitySubType,
          activityType: 'UPVOTE',
        }),
        this.intentDataService.getEnquiryActivityCount({
          accountId: user.accountId,
          enquiryId: enquiry.id,
          activityType: 'FOLLOW',
        }),
        this.intentDataService.getEnquiryActivities({
          accountId: user.accountId,
          enquiryId: enquiry.id,
          userId: user.id,
        }),
      ]);
    const interestCounts = {
      total: 0,
      attend: 0,
      speak: 0,
      sponsor: 0,
      exhibit: 0,
    };
    interestedCount.forEach((curr) => {
      interestCounts.total += curr._count.id;
      interestCounts[curr.interest.toLowerCase()] = curr._count.id;
    });

    const activityCounts = {
      total: 0,
      attend: 0,
      speak: 0,
      sponsor: 0,
      exhibit: 0,
    };
    activityCount.forEach((curr) => {
      activityCounts.total += curr._count.id;
      activityCounts[curr.activitySubType.toLowerCase()] = curr._count.id;
    });
    const owner = enquiry.owner
      ? {
        id: enquiry.owner.id,
        name: getNameFromEmail(
          enquiry.owner.email,
          enquiry.owner.firstname,
          enquiry.owner.lastname,
        ),
        email: enquiry.owner.email,
        imageUrl: enquiry.owner.imageUrl,
      }
      : null;
    return EnquiryResponseSchema.parse({
      ...enquiry,
      activityCount: activityCounts,
      interestedCount: interestCounts,
      myActivity: myActivity,
      owner,
      followerCount,
    });
    // return EnquiryResponseSchema.parse(enquiry);
  }

  async getEnquiryCount(data: GetEnquiryCountDto) {
    const enquiryCount = await this.enquiryDataService.getEnquiryCount(data);
    return enquiryCount;
  }

  async updateEnquiry(user: TCachedUser, data: UpdateEnquiryDto) {
    const enquiry = await this.enquiryDataService.updateEnquiry(data);
    return enquiry;
  }

  async setEnquiryOwner(
    user: TCachedUser,
    id: string,
    data: SetEnquiryOwnerHttpDto,
  ) {
    const enquiries = await this.enquiryDataService.getEnquiries({
      ids: [id],
      limit: 1,
      offset: 0,
      accountId: user.accountId,
    });
    if (enquiries.length === 0) {
      throw new HttpException('Enquiry not found', HttpStatus.NOT_FOUND);
    }
    const enquiry = enquiries[0];
    const users = await this.userDataService.getUsers({
      id: [data.ownerId],
      limit: 1,
      offset: 0,
      accountId: user.accountId,
    });
    if (users.length === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const owner = users[0];
    await this.enquiryDataService.updateEnquiry({
      id: enquiry.id,
      ownerId: owner.id,
    });
    return {
      id: owner.id,
      name: getNameFromEmail(owner.email, owner.firstname, owner.lastname),
      email: owner.email,
      profileImage: owner.imageUrl,
      designation: owner.designation,
      department: owner.department,
    };
  }

  async getEnquiryOwner(user: TCachedUser, id: string) {
    const enquiries = await this.enquiryDataService.getEnquiries({
      ids: [id],
      limit: 1,
      offset: 0,
      accountId: user.accountId,
    });
    if (enquiries.length === 0) {
      throw new HttpException('Enquiry not found', HttpStatus.NOT_FOUND);
    }
    const enquiry = enquiries[0];
    if (!enquiry.ownerId) {
      throw new HttpException('No Enquiry Owner Found', HttpStatus.NOT_FOUND);
    }
    const users = await this.userDataService.getUsers({
      id: [enquiry.ownerId],
      limit: 1,
      offset: 0,
      accountId: user.accountId,
    });
    if (users.length === 0) {
      throw new HttpException('No Enquiry Owner Found', HttpStatus.NOT_FOUND);
    }
    const owner = users[0];
    return {
      id: owner.id,
      name: getNameFromEmail(owner.email, owner.firstname, owner.lastname),
      email: owner.email,
      profileImage: owner.imageUrl,
      designation: owner.designation,
      department: owner.department,
    };
  }

  async checkUserUpvote(data: GetIntentDto) {
    if (
      !data.targetId ||
      !data.targetModule ||
      !data.accountId ||
      !data.userId
    ) {
      throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
    }
    const upvote = await this.intentDataService.getIntents({
      accountId: data.accountId,
      userId: data.userId,
      targetId: data.targetId,
      targetModule: data.targetModule,
      intentType: IntentType.UPVOTE,
    });
    if (upvote.length === 0) {
      return false;
    }
    return true;
  }

  async getEnquiryComments(
    user: TCachedUser,
    eventId: string,
    source: CommentSourceModule[],
    query: GetCommentsDto,
  ) {
    // const comments = await this.commentService.getComments({
    //   accountId: user.accountId,
    //   sourceModule: source,
    //   sourceId: id,
    //   limit: query.limit,
    //   offset: query.offset,
    // });
    // return comments;

    const { limit, offset, ...rest } = query;
    const [comments, commentsCount] = await Promise.all([
      this.enquiryDataService.getComments({
        ...rest,
        accountId: user.accountId,
        sourceModule: source,
        sourceId: eventId,
        limit: limit,
        offset: offset,
      }),
      this.enquiryDataService.getCommentCount({
        ...rest,
        accountId: user.accountId,
        sourceModule: source,
        sourceId: eventId,
      }),
    ]);

    const commentsWithUserUpvoted = { count: commentsCount, comments };
    if (user) {
      commentsWithUserUpvoted.comments = await Promise.all(
        comments.map(async (comment) => {
          const userUpvoted = await this.checkUserUpvote({
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
    return CommentsResponseSchema.parse(commentsWithUserUpvoted);
  }

  async getEnquiryInterestedUsers(
    user: TCachedUser,
    id: string,
    interest?: Interest,
  ) {
    const enquiries = await this.enquiryDataService.getEnquiries({
      ids: [id],
      limit: 1,
      offset: 0,
      accountId: user.accountId,
    });
    console.log({ enquiries });
    if (enquiries.length === 0) {
      throw new HttpException('Enquiry not found', HttpStatus.NOT_FOUND);
    }
    const enquiry = enquiries[0];
    const [interests, interestsCount] = await Promise.all([
      this.intentDataService.getUserEventInterest({
        accountId: user.accountId,
        enquiryId: enquiry.id,
        show: 'user',
        interest: interest
          ? [interest]
          : ['ATTEND', 'SPEAK', 'EXHIBIT', 'SPONSOR'],
      }),
      this.intentDataService.getUserEventInterestCount({
        accountId: user.accountId,
        enquiryId: enquiry.id,
        interest: interest
          ? [interest]
          : ['ATTEND', 'SPEAK', 'EXHIBIT', 'SPONSOR'],
      }),
    ]);
    // const interests = (await this.intentDataService.getUserEventInterest({
    //   accountId: user.accountId,
    //   enquiryId: enquiry.id,
    //   show: 'user',
    //   interest: interest
    //     ? [interest]
    //     : ['ATTEND', 'SPEAK', 'EXHIBIT', 'SPONSOR'],
    // })) as (UserEventInterest & { interestedUser: User })[];

    const interestedUsers = (
      interests as (UserEventInterest & { interestedUser: User })[]
    ).map((interest) => {
      const user = interest.interestedUser;
      return {
        id: user.id,
        userInterestId: interest.id,
        name: getNameFromEmail(user.email, user.firstname, user.lastname),
        email: user.email,
        profileImage: user.imageUrl,
        designation: user.designation,
        department: user.department,
        interest: interest.interest,
        status: interest.status,
      };
    });
    return {
      count: interestsCount,
      interestedUsers,
    };
  }

  async getEnquiryFollowers(user: TCachedUser, id: string) {
    const enquiries = await this.enquiryDataService.getEnquiries({
      ids: [id],
      limit: 1,
      offset: 0,
      accountId: user.accountId,
    });
    if (enquiries.length === 0) {
      throw new HttpException('Enquiry not found', HttpStatus.NOT_FOUND);
    }
    const enquiry = enquiries[0];
    const [followers, followersCount] = await Promise.all([
      this.intentDataService.getEnquiryActivities({
        enquiryId: enquiry.id,
        accountId: user.accountId,
        activityType: EnquiryActivityType.FOLLOW,
        show: 'user',
      }),
      this.intentDataService.getEnquiryActivityCount({
        enquiryId: enquiry.id,
        accountId: user.accountId,
        activityType: EnquiryActivityType.FOLLOW,
      }),
    ]);

    // const followersCount = ;
    const followersData = (
      followers as (EnquiryActivity & { user: User })[]
    ).map((follower) => {
      const user = follower.user;
      return {
        id: user.id,
        name: getNameFromEmail(user.email, user.firstname, user.lastname),
        email: user.email,
        profileImage: user.imageUrl,
        designation: user.designation,
        department: user.department,
      };
    });
    return {
      count: followersCount,
      followers: followersData,
    };
  }
}
