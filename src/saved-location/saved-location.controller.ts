import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SavedLocationService } from './saved-location.service';
import { GetUser } from 'src/user/decorator';
import { TCachedUser } from 'src/utils/types';
import { CreateSavedLocationDto, UpdateSavedLocationHttpDto } from './dto';
import { AuthGuard } from 'src/user/auth/guard';

@Controller('saved-location')
export class SavedLocationController {
  constructor(private readonly savedLocationService: SavedLocationService) {}

  @UseGuards(AuthGuard)
  @Post()
  async saveLocations(
    @Body() dto: CreateSavedLocationDto,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const savedLocation = await this.savedLocationService.saveLocations(
        dto,
        user,
      );
      return savedLocation;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  async updateSavedLocation(
    @Param('id') id: string,
    @Body() dto: UpdateSavedLocationHttpDto,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const updatedSavedLocation =
        await this.savedLocationService.updateSavedLocation(user, id, dto);
      return updatedSavedLocation;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async deleteSavedLocation(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const deletedSavedLocation =
        await this.savedLocationService.deleteSavedLocation(user, id);
      return deletedSavedLocation;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  async getSavedLocation(
    @Param('id') id: string,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const savedLocation = await this.savedLocationService.getSavedLocation(
        user,
        id,
      );
      return savedLocation;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
