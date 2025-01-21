import { InjectQueue } from '@nestjs/bull';
import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { JobSource } from '@prisma/client';
import { Queue } from 'bull';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueueActionOptions, SelectedUserDetails } from 'src/utils/types';
import { PayloadDTO } from './bull.dto';
import { z } from 'zod';

@Injectable()
export class CommunicationService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('eventProcessor') private readonly eventCanelQueue: Queue,
    @InjectQueue('inviteProcessor') private readonly inviteQueue: Queue,
    @InjectQueue('accessProcessor') private readonly accessQueue: Queue,
    @InjectQueue('otpProcessor') private readonly otpQueue: Queue,
    @InjectQueue('intendProcessor') private readonly intendQueue: Queue,
  ) {}
  async createJobForBull(
    processAction: QueueActionOptions,
    payload: unknown,
    userId: string,
    priority: number = 5,
  ) {
    try {
      let validatedPayload: z.infer<typeof PayloadDTO>;
      try {
        validatedPayload = PayloadDTO.parse(payload);
      } catch (error) {
        console.error('Invalid payload:', error);
        throw new Error('Payload validation failed');
      }
      const processEnumObject: object = {
        SEND_SIGN_UP_IN_EMAIL: 'signUp/InEmail',
        SEND_EVENT_CANCEL_EMAIL: 'eventCancelMail',
        SEND_PROMOTED_EVENT_INVITAION_EMAIL: 'invitationMail',
        SEND_TRACKER_ACCESS_EMAIL: 'shareAccess',
        SEND_EVENT_INTEND_CAPTURE_EMAIL: 'intendRecevied',
        SEND_EVENT_INTEND_UPDATE_EMAIL: 'intendUpdate',
      };
      const processToprocessorMapping: object = {
        shareAccess: 'accessProcessor',
        eventCancelMail: 'eventProcessor',
        invitationMail: 'inviteProcessor',
        'signUp/InEmail': 'otpProcessor',
        intendRecevied: 'intendProcessor',
        intendUpdate: 'intendProcessor',
      };
      const process: string = processEnumObject[processAction];
      const processor: string = processToprocessorMapping[process];
      console.log(process, processor);

      switch (process) {
        case 'shareAccess':
          await this.accessQueue.add(
            process,
            {
              ...validatedPayload,
              ...(await this.createJobInDatabase(
                userId,
                validatedPayload,
                'SEND_ACCESS',
              )),
            },
            {
              priority: priority,
            },
          );
          console.log('Call accessProcessor');
          break;
        case 'eventCancelMail':
          await this.eventCanelQueue.add(
            process,
            {
              ...validatedPayload,
              ...(await this.createJobInDatabase(
                userId,
                validatedPayload,
                'EVENT_CANCEl',
              )),
            },
            {
              priority: priority,
            },
          );
          console.log('Call eventProcessor');
          break;
        case 'invitationMail':
          await this.inviteQueue.add(
            process,
            {
              ...validatedPayload,
              ...(await this.createJobInDatabase(
                userId,
                validatedPayload,
                'SEND_INVITE',
              )),
            },
            {
              priority: priority,
            },
          );
          console.log('Call inviteProcessor');
          break;
        case 'signUp/InEmail':
          await this.otpQueue.add(
            process,
            {
              ...validatedPayload,
              ...(await this.createJobInDatabase(
                userId,
                validatedPayload,
                'SEND_OTP',
              )),
            },
            {
              priority: priority,
            },
          );
          console.log('Call otpProcessor');
          break;
        case 'intendRecevied':
          const job = await this.intendQueue.add(
            process,
            {
              ...validatedPayload,
              ...(await this.createJobInDatabase(
                userId,
                validatedPayload,
                'SEND_INTEND_CREATE',
              )),
            },
            {
              priority: priority,
              attempts: 5,
            },
          );
          console.log('Call intendProcessor');
          break;
        case 'intendUpdate':
          await this.intendQueue.add(
            process,
            {
              ...validatedPayload,
              ...(await this.createJobInDatabase(
                userId,
                validatedPayload,
                'SEND_INTEND_UPDATE',
              )),
            },
            {
              priority: priority,
            },
          );
          console.log('Call intendProcessor');
          break;
        default:
          console.log('Unknown action');
      }
      return { message: 'Job created successfully.' };
    } catch (error) {
      console.log(error);
      throw new HttpException('unable to create job.', HttpStatus.BAD_REQUEST);
    }
  }
  // async test() {
  //      await this.createJobForBull(QueueActionOptions.)
  // }
  private async createJobInDatabase(
    userId: string,
    payload: any,
    source: JobSource,
  ) {
    const job = await this.prisma.requestedJob.create({
      data: {
        userId: String(userId),
        inputData: payload,
        source: source,
      },
      select: {
        id: true,
      },
    });
    return { jobRequestId: job.id };
  }
}
