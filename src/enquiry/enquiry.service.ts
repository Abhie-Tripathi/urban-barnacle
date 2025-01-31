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
import { CommentService } from 'src/comment/comment.service';
import { GetCommentsDto } from 'src/comment/dto';
import { CommentSourceModule } from '@prisma/client';
import { EventsService } from 'src/events/events.service';

@Injectable()
export class EnquiryService {
  constructor(
    private readonly enquiryDataService: EnquiryDataService,
    private readonly intentDataService: IntentDataService,
    private readonly userDataService: UserDataService,
    // private readonly commentService: CommentService,
  ) {}

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
    const [interestedCount, activityCount, followerCount] = await Promise.all([
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
      }),
      this.intentDataService.getEnquiryActivityCount({
        accountId: user.accountId,
        enquiryId: enquiry.id,
        activityType: 'FOLLOW',
      }),
    ]);
    let totalInterestedCount = 0;
    const groupedInterestedCount = interestedCount.reduce((acc, curr) => {
      totalInterestedCount += curr._count.id;
      acc[curr.interest.toLowerCase()] = curr._count.id;
      return acc;
    }, {});

    let totalActivityCount = 0;
    const groupedActivityCount = activityCount.reduce((acc, curr) => {
      totalActivityCount += curr._count.id;
      acc[curr.activitySubType.toLowerCase()] = curr._count.id;
      return acc;
    }, {});
    return EnquiryResponseSchema.parse({
      ...enquiry,
      activityCount: { ...groupedActivityCount, total: totalActivityCount },
      interestedCount: {
        ...groupedInterestedCount,
        total: totalInterestedCount,
      },
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

  async getEnquiryComments(
    user: TCachedUser,
    id: string,
    source: CommentSourceModule,
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
    return {};
  }
}
