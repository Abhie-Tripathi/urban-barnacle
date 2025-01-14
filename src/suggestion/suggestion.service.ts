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
        return this.suggestionDataService.getEventTypes(dto) as Promise<
          EventTypeResponseDto[]
        >;
      case 'categories':
        return this.suggestionDataService.getCategories(dto) as Promise<
          CategoryResponseDto[]
        >;
      case 'designations':
        return this.suggestionDataService.getDesignations(dto) as Promise<
          CategoryResponseDto[]
        >;
      case 'companies':
        return this.suggestionDataService.getCompanies(dto) as Promise<
          CompanyResponseDto[]
        >;
      case 'locations':
        return this.suggestionDataService.getLocations(
          dto,
        ) as Promise<LocationResponseDto>;
      case 'tags':
        return this.suggestionDataService.getTags(dto) as Promise<
          TagResponseDto[]
        >;
      default:
        throw new HttpException(
          'Invalid suggestion type',
          HttpStatus.BAD_REQUEST,
        );
    }
  }
}
