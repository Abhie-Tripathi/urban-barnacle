import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SuggestionService } from './suggestion.service';
import { CategoryDto, EventTypeDto, SuggestionDto, LocationDto, TrackerDto } from './dto';
import { TagDto } from './dto/tags.dto';
import { AuthGuard } from 'src/user/auth/guard';
import { CompanyDto } from './dto/company.dto';

@Controller('suggestions')
export class SuggestionController {
  constructor(private readonly suggestionService: SuggestionService) { }

  @UseGuards(AuthGuard)
  @Get('event-types')
  async getEventTypes(@Query() dto: EventTypeDto) {
    try {
      const eventTypes = await this.suggestionService.getSuggestions(
        'event-types',
        dto,
      );
      return { data: { eventTypes } };
    } catch (error) {
      return { error: new HttpException(error, HttpStatus.BAD_REQUEST) };
    }
  }

  @UseGuards(AuthGuard)
  @Get('categories')
  async getCategories(@Query() dto: CategoryDto) {
    try {
      const categories = await this.suggestionService.getSuggestions(
        'categories',
        dto,
      );
      return { data: { categories } };
    } catch (error) {
      return { error: new HttpException(error, HttpStatus.BAD_REQUEST) };
    }
  }

  @UseGuards(AuthGuard)
  @Get('designations')
  async getDesignations(@Query() dto: CategoryDto) {
    try {
      const designations = await this.suggestionService.getSuggestions(
        'designations',
        dto,
      );
      return { data: { designations } };
    } catch (error) {
      return { error: new HttpException(error, HttpStatus.BAD_REQUEST) };
    }
  }

  @UseGuards(AuthGuard)
  @Get('companies')
  async getCompanies(@Query() dto: CompanyDto) {
    try {
      const companies = await this.suggestionService.getSuggestions(
        'companies',
        dto,
      );
      return { data: { companies } };
    } catch (error) {
      return { error: new HttpException(error, HttpStatus.BAD_REQUEST) };
    }
  }

  @UseGuards(AuthGuard)
  @Get('locations')
  async getLocations(@Query() dto: LocationDto) {
    try {
      const locations = await this.suggestionService.getSuggestions(
        'locations',
        dto,
      );
      return { data: locations };
    } catch (error) {
      return { error: new HttpException(error, HttpStatus.BAD_REQUEST) };
    }
  }

  @UseGuards(AuthGuard)
  @Get('tags')
  async getTags(@Query() dto: TagDto) {
    try {
      const tags = await this.suggestionService.getSuggestions('tags', dto);
      return { data: { tags } };
    } catch (error) {
      return { error: new HttpException(error, HttpStatus.BAD_REQUEST) };
    }
  }
  @UseGuards(AuthGuard)
  @Get('trackers')
  async getTrackerName(@Query() dto: TrackerDto) {
    try {
      const trackerName = await this.suggestionService.getTrackerName(
        dto,
      );
      return { data: { ...trackerName } };
    } catch (error) {
      return { error: new HttpException(error, HttpStatus.BAD_REQUEST) };
    }
  }
}
