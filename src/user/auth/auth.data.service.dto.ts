import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatDto, SourceDto } from './dto';
import { Prisma, User } from '@prisma/client';
import { createHash, randomInt, randomUUID } from 'crypto';
import { CommunicationService } from 'src/communication/communication.service';
import { QueueActionOptions, TCachedUser } from 'src/utils/types';
import { fetchDatafromMicroService } from 'src/shared/microservice.api';
import * as fs from 'fs';
@Injectable()
export class AuthDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
  ) { }

  async createVerificationToken(user: User, process: string) {
    const passkey = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 5);
    await this.prisma.verification.upsert({
      where: {
        userId: user.id,
      },
      update: {
        passkey: passkey,
        expiresAt: expiresAt,
        deleted: false,
      },
      create: {
        userId: user.id,
        passkey: passkey,
        expiresAt: expiresAt,
        deleted: false,
      },
    });
    await this.communicationService.createJobForBull(
      QueueActionOptions.SEND_SIGN_UP_IN_EMAIL,
      {
        otp: passkey,
        userInfo: {
          email: user.email,
          firstname: user.firstname || user.email.split('@')[0],
        },
        process,
        sourceId: String(passkey),
      },
      user.id,
      1,
    );

    return;
  }

  async getVerificationToken(email: string) {
    const verificationToken = await this.prisma.verification.findFirst({
      where: {
        user: {
          email: email,
        },
        deleted: false,
      },
    });
    return verificationToken;
    // return {
    //   passkey: '000000',
    //   expiresAt: new Date(Date.now() + 1000 * 60 * 5),
    // };
  }

  async getAccessToken(email: string) {
    const accessToken = await this.prisma.access.findFirst({
      where: {
        accessReceiver: {
          email: email,
        },
      },
      select: {
        token: true,
        expiry: true,
      },
    });
    return accessToken;
    // return {
    //   passkey: '000000',
    //   expiresAt: new Date(Date.now() + 1000 * 60 * 5),
    // };
  }

  async deleteVerificationToken(userId: string) {
    await this.prisma.verification.update({
      where: { userId },
      data: { deleted: true },
    });
  }

  async createMembershipToken(user: TCachedUser) {
    const passkey: string = createHash('sha256')
      .update(randomUUID(), 'hex')
      .digest()
      .toString('hex');
    await this.prisma.verification.upsert({
      where: {
        userId: user.id,
      },
      update: {
        passkey: passkey,
        deleted: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
      create: {
        userId: user.id,
        passkey: passkey,
        deleted: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });
    return { token: passkey }
  }

  async authenticateUserFromToken(sourceDto: SourceDto, body: AuthenticatDto) {
    if (sourceDto.source === '10times') {
      return (await fetchDatafromMicroService('authUserFetch', body)) as {
        "status": {
          "code": number
        },
        "message": string,
        "data": any,
        socialId?: object
      };
    }
    else if (sourceDto.source === 'google' && body.accessToken) { return await this.getGoogleUser(body.accessToken) }
    else if (sourceDto.source === 'linkedin' && body.accessToken) {
      return await this.getLinkedInUser(body.accessToken);
    }
    const responseToreturn: { status: { code: number }, message: string, data: any, socialId?: object } = { status: { code: 0 }, message: "invalid user", data: {} };
    return responseToreturn;
  }
  async getGoogleUser(accessToken: string) {
    const request = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    const response: {
      error_description: string,
      error: string
    } | {
      sub: string,
      hd: string,
      email: string,
      email_verified: string,
      name: string,
      picture: string,
      given_name: string,
      family_name: string,
    } = await request.json();
    console.log({ response });
    const responseToreturn: { status: { code: number }, message: string, data: any, socialId?: object } = { status: { code: 1 }, message: "valid user", data: {} };
    if (response['error_description'] && response['email_verified'] !== 'true') {
      responseToreturn.status.code = 0;
      responseToreturn.message = response['error_description'];
      return responseToreturn;
    }

    responseToreturn.data = {
      name: response['name'],
      email: response['email'],
      profilepicture: response['picture'],
      socialId: { userId: response['sub'] }
    }
    return responseToreturn;
  }
  async getLinkedInUser(accessToken: string) {
    const request = await fetch('https://api.linkedin.com/v2/userinfo', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!request.ok) {
      console.log('Failed to fetch LinkedIn user');
      // throw new Error('Failed to fetch LinkedIn user');
    }

    const response: {
      status: number, serviceErrorCode: number, code: string, message: string
    } | {
      sub: string,
      email_verified: string,
      name: string,
      locale: {
        country: string,
        language: string
      },
      given_name: string,
      family_name: string,
      email: string,
      picture: string
    } = await request.json();
    console.log({ response });
    const responseToreturn: { status: { code: number }, message: string, data: any, socialId?: object } = { status: { code: 1 }, message: "valid user", data: {} };
    if (response['serviceErrorCode'] && response['email_verified'] !== 'true') {
      responseToreturn.status.code = 0;
      responseToreturn.message = response['message'];
      return responseToreturn;
    }

    responseToreturn.data = {
      name: response['name'],
      email: response['email'],
      profilepicture: response['picture'],
      socialId: { userId: response['sub'] }
    }
    return responseToreturn;
  }
  async fetchImageFromOtherDomian(imageUrlstring: string, userId) {
    const response = await fetch(imageUrlstring);

    // if (!response.ok) {
    //   throw new HttpException(`Failed to fetch image. Status: ${response.status}`, HttpStatus.INTERNAL_SERVER_ERROR);
    // }

    const fileName = `${randomUUID() + new Date().toISOString()}.jpg`; // or any other logic to generate file name
    // const filePath = join(__dirname, '..', 'uploads', fileName);
    const mediaHost = process.env.MEDIA_STORAGE_DOMAIN ?? '';
    const dir = './public/temp/';
    const writer = fs.createWriteStream(dir + fileName);
    // response.body?.
    console.log();
    const picData = await response.arrayBuffer();
    if (picData !== undefined) {
      const buffer = Buffer.from(picData);
      await fs.promises.writeFile(dir + fileName, buffer);
      const filetype = 'IMAGE';
      const upload = await this.prisma.attachment.create({
        data: {
          fileName: imageUrlstring,
          fileType: filetype,
          fileSize: buffer.length / 1024,
          fileUrl: mediaHost + '/public/' + fileName,
          sourceModule: 'USER',
          sourceId: userId,
          createdByUser: { connect: { id: userId } },
        }
      });
      return upload;
    }
  }
}
