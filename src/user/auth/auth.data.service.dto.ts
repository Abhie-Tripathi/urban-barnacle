import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {} from './dto';
import { Prisma, User } from '@prisma/client';
import { randomInt } from 'crypto';
import { CommunicationService } from 'src/communication/communication.service';
import { QueueActionOptions } from 'src/utils/types';

@Injectable()
export class AuthDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
  ) {}

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
      },
      create: {
        userId: user.id,
        passkey: passkey,
        expiresAt: expiresAt,
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
}
