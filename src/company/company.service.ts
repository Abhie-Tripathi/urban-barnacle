import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  fetchDatafromMicroService,
  microServiceApis,
} from 'src/shared/microservice.api';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}
  async getCompanySuggestions(query: any) {
    try {
      const { data, error } = await fetchDatafromMicroService(
        'companySuggestionsFetch',
        query,
      );
      if (error) {
        return error;
      }
      return data;
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
