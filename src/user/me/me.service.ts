import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/prisma/prisma.service';
import { TCachedUser } from 'src/shared/types';
import { File } from '@nest-lab/fastify-multer';
import { FileCreationService } from 'src/shared/file-creation.service';

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileCreation: FileCreationService,
  ) {}
  async getProfileData(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          firstname: true,
          email: true,
          phoneNumber: true,
          department: true,
          designation: true,
          imageUrl: true,
        },
      });
      if (!user) {
        return {
          error: new HttpException(
            'user does not found',
            HttpStatus.BAD_REQUEST,
          ),
        };
      }
      // console.log(user);

      return {
        data: {
          user: {
            name: user.firstname,
            email: user.email,
            phoneNumber: user.phoneNumber ?? '',
            department: user?.department ?? '',
            designation: user?.designation ?? '',
            // fileName: user.UserDetail?.attachment?.fileName ?? '',
            profilePicture: user?.imageUrl ?? '',
            // fileType: user.UserDetail?.attachment?.fileType ?? '',
          },
        },
      };
    } catch (error) {
      console.log(JSON.stringify(error));
      return {
        error: new HttpException(
          'something went wrong',
          HttpStatus.BAD_REQUEST,
        ),
      };
    }
  }
  async updateProfile(body: any, userId: string, file: File) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
        },
      });
      if (!user) {
        return {
          error: new HttpException(
            'user does not found',
            HttpStatus.BAD_REQUEST,
          ),
        };
      }

      let userDataForUpdate = {};
      if (file) {
        const { error, fileData } = await this.fileCreation.createFile(
          '',
          file,
          userId,
          'IMAGE',
          'USER',
          userId,
        );
        if (error) {
          return error;
        }
        userDataForUpdate['imageUrl'] = fileData?.fileUrl;
        userDataForUpdate['profileImageId'] = fileData?.id;
      }
      if (body.phoneNumber) {
        userDataForUpdate['phoneNumber'] = body.phoneNumber;
      } else {
        userDataForUpdate['phoneNumber'] = null;
      }
      if (body.department) {
        userDataForUpdate['department'] = body.department;
      } else {
        userDataForUpdate['department'] = null;
      }
      // console.log(proObj);
      if (body.designation) {
        userDataForUpdate['designation'] = body.designation;
      } else {
        userDataForUpdate['designation'] = null;
      }

      if (body.removePicture) {
        userDataForUpdate['imageUrl'] = null;
        userDataForUpdate['profileImageId'] = null;
      }
      const userdetail = await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          ...userDataForUpdate,
        },
        select: {
          id: true,
        },
      });
      return {
        data: {
          message: 'user data updated successfully',
        },
      };
    } catch (error) {
      console.log(JSON.stringify(error));

      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return {
          error: new HttpException(
            'Phone number already exist',
            HttpStatus.CONFLICT,
          ),
        };
      }
      return {
        error: new HttpException(
          'something went wrong',
          HttpStatus.BAD_REQUEST,
        ),
      };
    }
  }
}
