import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { LocationType, SavedLocation } from '@prisma/client';
import { SharedService } from 'src/shared/shared.service';
import { LocationDto, LocationResponseDto } from 'src/suggestion/dto';
import { SuggestionService } from 'src/suggestion/suggestion.service';
import { SavedLocationDataService } from './saved-location.data.service';
import { TCachedUser } from 'src/utils/types';
import {
  CreateSavedLocationDto,
  GetSavedLocationsHttpDto,
  UpdateSavedLocationHttpDto,
} from './dto';
import { UserDataService } from 'src/user/user.data.service';
import { AuthService } from 'src/user/auth/auth.service';

@Injectable()
export class SavedLocationService {
  constructor(
    private readonly suggestionService: SuggestionService,
    private readonly sharedService: SharedService,
    private readonly savedLocationDataService: SavedLocationDataService,
    private readonly userDataService: UserDataService,
  ) {}

  async saveAreaOfSavedLocation(savedLocation: SavedLocation) {
    let area: null | number = null;
    if (savedLocation.type === LocationType.LOCATION_ID) {
      const location = (await this.suggestionService.getSuggestions(
        'locations',
        {
          ids: [savedLocation.locationId],
        } as LocationDto,
      )) as LocationResponseDto;
      const loc = location.formattedLocations[0];
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${loc.displayName}&format=geojson&polygon_geojson=1&limit=5`;
      const nominatimResponse = await fetch(nominatimUrl);
      const locationGeoJson = await nominatimResponse.json();
      area = await this.sharedService.getArea(locationGeoJson);
    } else {
      const radius = savedLocation.radius ? savedLocation.radius : 0;
      const radiusInKm =
        radius && savedLocation.radiusUnit === 'MI'
          ? radius * 1.609344
          : radius;
      area = +(Math.PI * Math.pow(radiusInKm, 2)).toFixed(2);
    }
    await this.savedLocationDataService.updateSavedLocation({
      id: savedLocation.id,
      area,
    });
  }

  async setPrimaryLocation(user: TCachedUser, location: SavedLocation) {
    if (user.primaryLocation) {
      return;
    }
    const data = {
      primaryLocation: {
        locationType: location.type,
      },
    };
    if (location.type === LocationType.LOCATION_ID) {
      data.primaryLocation['locationId'] = location.locationId;
    } else if (location.type === LocationType.GEO_JSON) {
      data.primaryLocation['geoJson'] = {
        geometry: {
          type: location.geomType,
          coordinates: [location.latitude, location.longitude],
        },
        properties: {
          // locationName: location.locationName,
          radius: location.radius,
          radiusUnit: location.radiusUnit,
        },
      };
    }
    const updatedUser = await this.userDataService.updateUser({
      id: user.id,
      primaryLocation: data.primaryLocation,
    });

    return {
      data: {
        user: await this.sharedService.UserResponse(
          {
            ...updatedUser,
            accountId: user.accountId,
            accountConfigurationId: user.accountConfigurationId,
            currentSubscriptionId: user.accountConfigurationId,
          },
          user.token,
        ),
      },
    };
  }

  async saveLocations(dto: CreateSavedLocationDto, user: TCachedUser) {
    const locations: CreateSavedLocationDto = [];
    dto.forEach((location) => {
      const data = {
        locationType: location.locationType,
        locationName: location.locationName,
      };
      if (location.locationType === LocationType.GEO_JSON) {
        // data['geoJson'] = location.geoJson;
        data['latitude'] = location.geoJson?.geometry.coordinates[0];
        data['longitude'] = location.geoJson?.geometry.coordinates[1];
        data['radius'] = location.geoJson?.properties.radius;
        data['radiusUnit'] = location.geoJson?.properties.radiusUnit;
        data['geomType'] = location.geoJson?.geometry.type;
      } else if (location.locationType === LocationType.LOCATION_ID) {
        data['locationId'] = location.locationId;
      }
      if (location.tags && location.tags.length > 0) {
        data['tags'] = location.tags
          .map((label) => label.toLowerCase())
          .join(' , ');
      }
      if (location.customName) {
        data['customName'] = location.customName;
      }
      locations.push(data);
    });

    const locationData: Record<string, LocationResponseDto | null> = {};
    locations.forEach(async (location) => {
      console.log({ location });
      if (location.locationType === 'LOCATION_ID' && location.locationId) {
        locationData[location.locationId] = null;
      } else if (location.locationType === 'GEO_JSON') {
        return;
      } else {
        throw new HttpException('Invalid location', HttpStatus.BAD_REQUEST);
      }
    });

    if (Object.keys(locationData).length > 0) {
      const validLocations = (await this.suggestionService.getSuggestions(
        'locations',
        {
          ids: Object.keys(locationData),
        },
      )) as LocationResponseDto;

      if (
        validLocations.formattedLocations.length !==
        Object.keys(locationData).length
      ) {
        throw new HttpException('Invalid location', HttpStatus.BAD_REQUEST);
      }
    }

    const savedLocations = await this.savedLocationDataService.saveLocations(
      locations,
      user,
    );

    Promise.all([
      savedLocations.map(async (location) => {
        await this.saveAreaOfSavedLocation(location);
      }),
      this.setPrimaryLocation(user, savedLocations[0]),
    ]);

    return savedLocations;
  }

  async getSavedLocations(user: TCachedUser, params: GetSavedLocationsHttpDto) {
    const savedLocations = this.savedLocationDataService.getSavedLocations(
      user,
      params,
    );
    return savedLocations;
  }

  async getSavedLocation(user: TCachedUser, id: string) {
    const savedLocation = await this.savedLocationDataService.getSavedLocations(
      user,
      {
        id: [id],
        limit: 1,
        offset: 0,
      },
    );
    if (!savedLocation || (savedLocation && savedLocation.length === 0)) {
      throw new HttpException('Saved location not found', HttpStatus.NOT_FOUND);
    }
    return savedLocation[0];
  }

  async deleteSavedLocation(user: TCachedUser, id: string) {
    const savedLocation = await this.savedLocationDataService.getSavedLocations(
      user,
      {
        id: [id],
        limit: 1,
        offset: 0,
      },
    );
    if (!savedLocation || (savedLocation && savedLocation.length === 0)) {
      throw new HttpException('Saved location not found', HttpStatus.NOT_FOUND);
    }
    const savedLocationData = savedLocation[0];
    await this.savedLocationDataService.updateSavedLocation({
      id: savedLocationData.id,
      deleted: true,
    });
    return { message: 'Saved location deleted successfully' };
  }

  async updateSavedLocation(
    user: TCachedUser,
    savedLocationId: string,
    data: UpdateSavedLocationHttpDto,
  ) {
    const savedLocation = await this.savedLocationDataService.getSavedLocations(
      user,
      {
        id: [savedLocationId],
        limit: 1,
        offset: 0,
      },
    );
    if (!savedLocation || (savedLocation && savedLocation.length === 0)) {
      throw new HttpException('Saved location not found', HttpStatus.NOT_FOUND);
    }
    const savedLocationData = savedLocation[0];
    const updatedSavedLocation =
      await this.savedLocationDataService.updateSavedLocation({
        id: savedLocationData.id,
        ...data,
      });
    return updatedSavedLocation;
  }
}
