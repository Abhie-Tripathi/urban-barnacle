import { Controller, Get } from '@nestjs/common';
import { EnquiryService } from './enquiry.service';

@Controller('enquiry')
export class EnquiryController {
  constructor(private readonly enquiryService: EnquiryService) {}
}
