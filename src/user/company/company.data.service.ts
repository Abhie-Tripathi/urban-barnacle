import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto, GetCompanyDto } from './dto';

@Injectable()
export class CompanyDataService {
  constructor(private readonly prisma: PrismaService) {}

  async createCompany(data: CreateCompanyDto) {
    const company = await this.prisma.company.create({
      data,
    });
    return company;
  }

  async updateCompany(data: UpdateCompanyDto) {
    const company = await this.prisma.company.update({
      where: { id: data.id },
      data,
    });
    return company;
  }

  async getCompany(data: GetCompanyDto) {
    const company = await this.prisma.company.findFirst({
      where: { ...data },
    });
    return company;
  }
}
