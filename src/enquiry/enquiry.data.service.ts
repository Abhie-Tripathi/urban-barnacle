import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { microserviceEndpoints } from 'src/utils/endpoints';
import { ConfigService } from '@nestjs/config';
import { CreateEnquiryDto, GetEnquiriesDto } from './dto/create.dto';

@Injectable()
export class EnquiryDataService {
  constructor(private readonly prisma: PrismaService) {}

  async createEnquiry(data: CreateEnquiryDto) {
    const enquiry = await this.prisma.enquiry.create({
      data,
    });
    return enquiry;
  }

  async getEnquiries(data: GetEnquiriesDto) {
    const enquiries = await this.prisma.enquiry.findMany({
      where: {
        eventData: {
          path: ['eventId'],
          equals: data.eventId,
        },
      },
    });
    return enquiries;
  }
}
