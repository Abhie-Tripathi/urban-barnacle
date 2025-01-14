import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {} from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthDataService {
  constructor(private readonly prisma: PrismaService) {}

  //   async createVerificationToken(data: CreateVerificationTokenDto) {

  //   }

  async getVerificationToken() {
    return {
      passkey: '000000',
      expiresAt: new Date(Date.now() + 1000 * 60 * 5),
    };
  }
}
