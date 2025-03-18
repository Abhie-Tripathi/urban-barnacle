import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatDto } from './dto';
import { Prisma, User } from '@prisma/client';
import { createHash, randomInt, randomUUID } from 'crypto';
import { CommunicationService } from 'src/communication/communication.service';
import { QueueActionOptions, TCachedUser } from 'src/utils/types';
import { fetchDatafromMicroService } from 'src/shared/microservice.api';
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

  async authenticateUserFromToken(body: AuthenticatDto) {
    return (await fetchDatafromMicroService('authUserFetch', body)) as {
      "status": {
        "code": number
      },
      "message": string,
      "data": any
    };
  }
}
