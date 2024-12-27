import { Controller, Get, Query } from '@nestjs/common';
import { CompanyService } from './company.service';
import { Query_Dto } from './dto';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}
  @Get('suggestions')
  async getCompanySuggestions(@Query() query: Query_Dto) {
    return await this.companyService.getCompanySuggestions(query);
  }
}
