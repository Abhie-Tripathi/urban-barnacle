import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SuggestionDataService } from './suggestion.data.service';
import {
  CategoryDto,
  EventTypeDto,
  SuggestionDto,
  LocationDto,
  EventTypeResponseDto,
  CategoryResponseDto,
  LocationResponseDto,
  TrackerDto,
} from './dto';
import { CompanyResponseDto } from './dto/company.dto';
import { TagResponseDto } from './dto/tags.dto';

type SuggestionType =
  | 'event-types'
  | 'categories'
  | 'designations'
  | 'companies'
  | 'locations'
  | 'tags';

@Injectable()
export class SuggestionService {
  constructor(private readonly suggestionDataService: SuggestionDataService) {}

  async getSuggestions(suggestionType: SuggestionType, dto: any): Promise<any> {
    switch (suggestionType) {
      case 'event-types':
        return (await this.suggestionDataService.getEventTypes(
          dto,
        )) as EventTypeResponseDto[];
      case 'categories':
        return (await this.suggestionDataService.getCategories(
          dto,
        )) as CategoryResponseDto[];
      case 'designations':
        return (await this.suggestionDataService.getDesignations(
          dto,
        )) as CategoryResponseDto[];
      case 'companies':
        return (await this.suggestionDataService.getCompanies(
          dto,
        )) as CompanyResponseDto[];
      case 'locations':
        return (await this.suggestionDataService.getLocations(
          dto,
        )) as LocationResponseDto;
      case 'tags':
        return (await this.suggestionDataService.getTags(
          dto,
        )) as TagResponseDto[];
      default:
        throw new HttpException(
          'Invalid suggestion type',
          HttpStatus.BAD_REQUEST,
        );
    }
  }
  async getTrackerName(dto: TrackerDto) {
    return await this.suggestionDataService.getTrackerName(dto);
  }
}
