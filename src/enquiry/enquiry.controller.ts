import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { EnquiryService } from './enquiry.service';
import { UpdateEnquiryHttpDto } from './dto';
import { GetUser } from 'src/user/decorator';
import { TCachedUser } from 'src/utils/types';

@Controller('enquiry')
export class EnquiryController {
  constructor(private readonly enquiryService: EnquiryService) {}

  @Patch(':id')
  async updateEnquiry(
    @Param('id') id: string,
    @Body() data: UpdateEnquiryHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    return this.enquiryService.updateEnquiry(user, { ...data, id });
  }
}
