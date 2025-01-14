import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EnquirycreateDto } from './dto/create.dto';
import { TCachedUser } from 'src/shared/types';

@Injectable()
export class EnquiryService {
  constructor(private readonly prisma: PrismaService) {}
  async createEnquiry(body: EnquirycreateDto, userData: TCachedUser) {
    try {
      // const createEnquiry = await this.prisma.enquiry.create({
      //   data: {
      //     account: { connect: { id: String(userData.accountId) } },
      //     initiatedByUser: { connect: { id: userData.id } },
      //     eventId: body.eventId,
      //   },
      // });
      // return { data: createEnquiry };
    } catch (error) {
      console.log(error + '');
      return {
        error: new HttpException(
          'something went wrong',
          HttpStatus.BAD_REQUEST,
        ),
      };
    }
  }
}
