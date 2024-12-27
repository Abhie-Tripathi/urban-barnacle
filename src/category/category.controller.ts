import { Controller, Get, Query } from '@nestjs/common';
import { CategoryService } from './category.service';
import { SearchCategoryDto } from './dto';

@Controller()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}
  @Get('category')
  async getCategory(@Query() query: SearchCategoryDto) {
    return await this.categoryService.getCategory(query);
  }
  @Get('designation')
  async getDesignation(@Query() query: SearchCategoryDto) {
    return await this.categoryService.getDesignation(query);
  }
}
