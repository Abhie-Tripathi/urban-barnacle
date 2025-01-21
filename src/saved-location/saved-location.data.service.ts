import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateSavedLocationDto,
  GetSavedLocationsDto,
  UpdateSavedLocationDto,
} from './dto';
import { TCachedUser } from 'src/utils/types';
import { Prisma } from '@prisma/client';

@Injectable()
export class SavedLocationDataService {
  constructor(private readonly prisma: PrismaService) {}

  async saveLocations(locations: CreateSavedLocationDto, user: TCachedUser) {
    const savedLocations = await this.prisma.$transaction(
      locations.map((location) => {
        const { tags, locationType, ...rest } = location;
        return this.prisma.savedLocation.create({
          data: {
            ...rest,
            type: locationType,
            userId: user.id,
            accountId: user.accountId,
          },
        });
      }),
    );
    if (!savedLocations || savedLocations.length === 0) {
      throw new HttpException(
        'could not save location, something went wrong',
        HttpStatus.BAD_REQUEST,
      );
    }
    return savedLocations;
  }

  async updateSavedLocation(savedLocation: UpdateSavedLocationDto) {
    const { id, ...rest } = savedLocation;
    const updatedSavedLocation = await this.prisma.savedLocation.update({
      where: {
        id,
      },
      data: rest,
    });
    return updatedSavedLocation;
  }

  async getSavedLocations(user: TCachedUser, params: GetSavedLocationsDto) {
    const { limit, offset, id, ...rest } = params;
    const where: Prisma.SavedLocationWhereInput = {
      userId: user.id,
      accountId: user.accountId,
      ...rest,
    };
    if (id && id.length > 0) {
      where.id = {
        in: id,
      };
    }
    const savedLocations = await this.prisma.savedLocation.findMany({
      where,
      skip: offset,
      take: limit,
    });
    return savedLocations;
  }
}
