import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Event, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { InviteEmailDataSchema } from 'src/communication/bull.dto';
import { CommunicationService } from 'src/communication/communication.service';
import { QueueActionOptions } from 'src/utils/types';
@Injectable()
export class InviteDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
  ) { }
  async findAllowance(userId: string) {
    const allowcation = await this.prisma.credit.findFirst({
      where: {
        entityId: userId,
        entityType: 'USER',
      },
    });
    return allowcation;
  }
  async getInviteCountAndData(where: any, limit: number, offset: number) {
    const [count, invite] = await Promise.all([
      this.prisma.invitation.count({
        ...where,
      }),
      this.prisma.invitation.findMany({
        ...where,
        select: {
          email: true,
        },
        distinct: ['email'],
        take: limit,
        skip: offset,
      }),
    ]);
    return { count, invite };
  }
  async createAllowance(userId: string) {
    const allowcation = await this.prisma.credit.create({
      data: {
        entityId: userId,
        entityType: 'USER',
        count: 15,
        creditType: 'INVITAION',
      },
    });
    return allowcation;
  }
  async updateAllowance(allowcationId: string, count: number) {
    const update = await this.prisma.credit.update({
      where: {
        id: allowcationId,
      },
      data: {
        count: count,
      },
    });
    return update;
  }
  async findEvent(eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
      },
    });
    return { event };
  }
  async createInvitation(
    email: string,
    userAccountId: string,
    userId: string,
    eventId: string,
  ) {
    const invitation = await this.prisma.invitation.create({
      data: {
        email: email,
        accountId: userAccountId,
        userId: userId,
        entityType: 'EVENT',
        entityId: eventId,
      },
    });
    return invitation;
  }
  //InviteEmailDataDTO
  async SendInvitation(
    email: string,
    eventData: Event,
    redirectUrl: string,
    userInterestId: string,
    userId: string,
    invitaionId: string
  ) {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const encrypt = (text: string, key: string): string => {
      const cipher = crypto.createCipheriv(
        algorithm,
        Buffer.from(key, 'utf-8'),
        iv,
      );
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    };
    const originalKey = process.env.INVITE_ENCRYPT_KEY ?? '';
    const key = crypto
      .createHash('sha256')
      .update(originalKey)
      .digest('base64')
      .slice(0, 32);

    const jobPayload: Object = {
      sourceId: invitaionId,
      userEmail: email,
      eventName: eventData.name,
      eventStartDate: (eventData.data as any)['start_date'],
      eventEndDate: (eventData.data as any)['end_date'],
      eventLocation:
        (eventData?.data?.['location_city'].length > 1
          ? eventData?.data?.['location_city'] + ', '
          : '') + (eventData as any).data['location_country'],
      eventRedirectUrl: redirectUrl,
      encryptYes: encrypt(
        `email=${email}&onClicked=yes&id=${userInterestId}`,
        key,
      ),
      encryptNo: encrypt(
        `email=${email}&onClicked=no&id=${userInterestId}`,
        key,
      ),
    };
    await this.communicationService.createJobForBull(
      QueueActionOptions.SEND_PROMOTED_EVENT_INVITAION_EMAIL,
      InviteEmailDataSchema.parse(jobPayload),
      userId,
    );
  }
}
