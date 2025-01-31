import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EnquiryService } from './enquiry.service';
import { SetEnquiryOwnerHttpDto, UpdateEnquiryHttpDto } from './dto';
import { GetUser } from 'src/user/decorator';
import { TCachedUser } from 'src/utils/types';
import { AuthGuard } from 'src/user/auth/guard';
import { GetCommentsDto } from 'src/comment/dto';
import { CommentSourceModule } from '@prisma/client';

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

  @UseGuards(AuthGuard)
  @Post(':id/owner')
  async setEnquiryOwner(
    @Param('id') id: string,
    @Body() data: SetEnquiryOwnerHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const owner = await this.enquiryService.setEnquiryOwner(user, id, data);
      return {
        data: { owner },
      };
    } catch (error) {
      return {
        error: error,
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/owner')
  async getEnquiryOwner(@Param('id') id: string, @GetUser() user: TCachedUser) {
    try {
      const owner = await this.enquiryService.getEnquiryOwner(user, id);
      return {
        data: { owner },
      };
    } catch (error) {
      return {
        error: error,
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id/:source/comments')
  async getEnquiryComments(
    @Param('id') id: string,
    @Param('source') source: CommentSourceModule,
    @GetUser() user: TCachedUser,
    @Query() query: GetCommentsDto,
  ) {
    try {
      const comments = await this.enquiryService.getEnquiryComments(
        user,
        id,
        source,
        query,
      );
      return {
        data: comments,
      };
    } catch (error) {
      return {
        error: error,
      };
    }
  }
}
