import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/prisma/prisma.service';
import { TCachedUser } from 'src/utils/types';
import { File } from '@nest-lab/fastify-multer';
import { FileCreationService } from 'src/shared/file-creation.service';
import { UpdateMeDto } from './dto/update.dto';
import { UserDataService } from '../user.data.service';
import { GetTrackersHttpDto } from 'src/tracker/dto';
import { TrackerService } from 'src/tracker/tracker.service';
import { GetMyExportsDto, GetRecentEventSearchesDto } from './dto';
import { MeDataService } from './me.data.service';
import { SavedLocationService } from 'src/saved-location/saved-location.service';
import { GetSavedLocationsHttpDto } from 'src/saved-location/dto';
import { ExportDataService } from 'src/exports/exports.data.service';
import { UserService } from '../user.service';

@Injectable()
export class MeService {
  constructor(
    // private readonly fileCreation: FileCreationService,
    private readonly userDataService: UserDataService,
    private readonly userService: UserService,
    private readonly trackerService: TrackerService,
    private readonly meDataService: MeDataService,
    private readonly savedLocationService: SavedLocationService,
    private readonly exportDataService: ExportDataService,
  ) {}

  async updateMe(userId: string, params: UpdateMeDto) {
    const user = await this.userDataService.updateUser({
      ...params,
      id: userId,
    });
    return user;
  }

  async getMyTrackers(user: TCachedUser, params: GetTrackersHttpDto) {
    const { limit, offset } = params;
    console.log({ params });
    const [trackers, trackerCount] = await Promise.all([
      this.trackerService.getTrackers(user, { ...params, limit, offset }),
      this.trackerService.getTrackersCount(user, params),
    ]);

    return { count: trackerCount, trackers };
  }

  async getMyRecentSearches(
    user: TCachedUser,
    params: GetRecentEventSearchesDto,
  ) {
    const recentSearches = await this.meDataService.getRecentEventSearches(
      user,
      params,
    );
    return recentSearches;
  }

  async getMySavedLocations(
    user: TCachedUser,
    params: GetSavedLocationsHttpDto,
  ) {
    const savedLocations = await this.savedLocationService.getSavedLocations(
      user,
      params,
    );
    return savedLocations;
  }

  async getMyExports(user: TCachedUser, params: GetMyExportsDto) {
    const exports = await this.exportDataService.getExports(user, params);
    return exports;
  }

  async signOut(token: string) {
    await this.userService.signOut(token);
    return {
      message: 'Successfully logged out',
    };
  }

  async switchAccount(user: TCachedUser, accountId: string) {
    await this.userService.switchAccount(user, accountId);
  }

  // async getProfileData(userId: string) {
  //   try {
  //     const user = await this.prisma.user.findUnique({
  //       where: {
  //         id: userId,
  //       },
  //       select: {
  //         firstname: true,
  //         email: true,
  //         phoneNumber: true,
  //         department: true,
  //         designation: true,
  //         imageUrl: true,
  //       },
  //     });
  //     if (!user) {
  //       return {
  //         error: new HttpException(
  //           'user does not found',
  //           HttpStatus.BAD_REQUEST,
  //         ),
  //       };
  //     }
  //     // console.log(user);

  //     return {
  //       data: {
  //         user: {
  //           name: user.firstname,
  //           email: user.email,
  //           phoneNumber: user.phoneNumber ?? '',
  //           department: user?.department ?? '',
  //           designation: user?.designation ?? '',
  //           // fileName: user.UserDetail?.attachment?.fileName ?? '',
  //           profilePicture: user?.imageUrl ?? '',
  //           // fileType: user.UserDetail?.attachment?.fileType ?? '',
  //         },
  //       },
  //     };
  //   } catch (error) {
  //     console.log(JSON.stringify(error));
  //     return {
  //       error: new HttpException(
  //         'something went wrong',
  //         HttpStatus.BAD_REQUEST,
  //       ),
  //     };
  //   }
  // }

  // async updateProfile(body: any, userId: string, file: File) {
  //   try {
  //     const user = await this.prisma.user.findUnique({
  //       where: {
  //         id: userId,
  //       },
  //       select: {
  //         id: true,
  //       },
  //     });
  //     if (!user) {
  //       return {
  //         error: new HttpException(
  //           'user does not found',
  //           HttpStatus.BAD_REQUEST,
  //         ),
  //       };
  //     }

  //     let userDataForUpdate = {};
  //     if (file) {
  //       const { error, fileData } = await this.fileCreation.createFile(
  //         '',
  //         file,
  //         userId,
  //         'IMAGE',
  //         'USER',
  //         userId,
  //       );
  //       if (error) {
  //         return error;
  //       }
  //       userDataForUpdate['imageUrl'] = fileData?.fileUrl;
  //       userDataForUpdate['profileImageId'] = fileData?.id;
  //     }
  //     if (body.phoneNumber) {
  //       userDataForUpdate['phoneNumber'] = body.phoneNumber;
  //     } else {
  //       userDataForUpdate['phoneNumber'] = null;
  //     }
  //     if (body.department) {
  //       userDataForUpdate['department'] = body.department;
  //     } else {
  //       userDataForUpdate['department'] = null;
  //     }
  //     // console.log(proObj);
  //     if (body.designation) {
  //       userDataForUpdate['designation'] = body.designation;
  //     } else {
  //       userDataForUpdate['designation'] = null;
  //     }

  //     if (body.removePicture) {
  //       userDataForUpdate['imageUrl'] = null;
  //       userDataForUpdate['profileImageId'] = null;
  //     }
  //     const userdetail = await this.prisma.user.update({
  //       where: {
  //         id: userId,
  //       },
  //       data: {
  //         ...userDataForUpdate,
  //       },
  //       select: {
  //         id: true,
  //       },
  //     });
  //     return {
  //       data: {
  //         message: 'user data updated successfully',
  //       },
  //     };
  //   } catch (error) {
  //     console.log(JSON.stringify(error));

  //     if (
  //       error instanceof PrismaClientKnownRequestError &&
  //       error.code === 'P2002'
  //     ) {
  //       return {
  //         error: new HttpException(
  //           'Phone number already exist',
  //           HttpStatus.CONFLICT,
  //         ),
  //       };
  //     }
  //     return {
  //       error: new HttpException(
  //         'something went wrong',
  //         HttpStatus.BAD_REQUEST,
  //       ),
  //     };
  //   }
  // }
}
