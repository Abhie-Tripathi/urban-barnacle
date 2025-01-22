import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EnquiryService } from './enquiry.service';
import { UpdateEnquiryHttpDto } from './dto';
import { GetUser } from 'src/user/decorator';
import { TCachedUser } from 'src/utils/types';
import { AuthGuard } from 'src/user/auth/guard';

@Controller('enquiries')
export class EnquiryController {
  constructor(private readonly enquiryService: EnquiryService) {}

  @UseGuards(AuthGuard)
  @Patch(':id')
  async updateEnquiry(
    @Param('id') id: string,
    @Body() data: UpdateEnquiryHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const enquiry = await this.enquiryService.updateEnquiry(user, {
        ...data,
        id,
      });
      return {
        data: enquiry,
      };
    } catch (error) {
      return {
        error: error,
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  async getEnquiry(@Param('id') id: string, @GetUser() user: TCachedUser) {
    try {
      const enquiry = await this.enquiryService.getEnquiry(user, id);
      return {
        data: enquiry,
      };
    } catch (error) {
      return {
        error: error,
      };
    }
  }
}
