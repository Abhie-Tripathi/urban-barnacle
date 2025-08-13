import { BadRequestException, Body, Controller, Get, HttpException, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { OthersService } from './others.service';
import { ContactUsDto, contactUsSchema, DemoContactDto, demoContactSchema, PresetDto, TrackerShareAccessDto } from './dto';
import { ZodError } from 'zod';
import { AuthGuard } from 'src/user/auth/guard';

@Controller('others')
export class OthersController {
  constructor(private readonly othersService: OthersService) { }

  @Get('preset')
  async getPresetData(@Query() query: PresetDto) {
    try {
      if (query.limit > 20) {
        query.limit = 20;
      }
      return await this.othersService.getPresetData(query);
    } catch (error) {
      return error;
    }
  }
  @Post('contactMail/:source')
  async sendDemoContactEmail(@Param('source') source: 'demoContact' | 'contactUs', @Body() body: DemoContactDto |
    ContactUsDto) {
    try {
      let parsedData;

      try {
        if (source === 'demoContact') {
          parsedData = demoContactSchema.parse(body);
        } else if (source === 'contactUs') {
          parsedData = contactUsSchema.parse(body);
        } else {
          throw new BadRequestException('Invalid source parameter');
        }
      } catch (err) {
        if (err instanceof ZodError) {
          throw new BadRequestException(err.errors);
        }
        throw err;
      }
      return await this.othersService.sendDemoContactEmail(source, parsedData);
    } catch (error) {
      return error;
    }
  }
  @Post('share-tracker-access/:token')
  async createTrackerAccess(@Body() body: TrackerShareAccessDto, @Param('token') token: string) {
    try {
      if (process.env.TRACKER_ACCESS_SHARE_TOKEN !== token) {
        throw new HttpException('token not fount/matched', HttpStatus.FORBIDDEN);
      }
      return await this.othersService.createTrackerAccess(body);
    } catch (error) {
      return { error };
    }
  }
}
