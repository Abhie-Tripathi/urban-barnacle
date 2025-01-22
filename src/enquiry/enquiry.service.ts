import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { TCachedUser } from 'src/utils/types';
import { CreateEnquiryDto, GetEnquiriesDto, UpdateEnquiryDto } from './dto';
import { EnquiryDataService } from './enquiry.data.service';

@Injectable()
export class EnquiryService {
  constructor(private readonly enquiryDataService: EnquiryDataService) {}

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
    return enquiry;
  }

  async updateEnquiry(user: TCachedUser, data: UpdateEnquiryDto) {
    const enquiry = await this.enquiryDataService.updateEnquiry(data);
    return enquiry;
  }
}
