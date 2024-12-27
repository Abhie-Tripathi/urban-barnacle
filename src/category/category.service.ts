import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { fetchDatafromMicroService } from 'src/shared/microservice.api';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}
  async getCategory(query: any) {
    try {
      const { data, error } = await fetchDatafromMicroService(
        'categoryFetch',
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
  async getDesignation(query: any) {
    try {
      const { data, error } = await fetchDatafromMicroService(
        'designationFetch',
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
