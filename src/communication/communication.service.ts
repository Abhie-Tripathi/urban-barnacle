import { InjectQueue } from '@nestjs/bull';
import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { JobSource } from '@prisma/client';
import { Job, Queue } from 'bull';
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
    @InjectQueue('demoContactProcessor') private readonly demoContactQueue: Queue,
    @InjectQueue('errorProcessor') private readonly errorQueue: Queue,
  ) { }
  async createJobForBull(
    processAction: QueueActionOptions,
    payload: unknown,
    userId: string,
    priority: number = 5,
  ) {
    try {
      console.log(payload);
      let validatedPayload: z.infer<typeof PayloadDTO>;
      let jobRequestPayload;
      let sourceId: string;
      try {
        validatedPayload = PayloadDTO.parse(payload);
        jobRequestPayload = Object.assign(validatedPayload);
        sourceId = jobRequestPayload.sourceId;
      } catch (error) {
        console.error('Invalid payload:', error);
        throw new HttpException('Payload validation failed', HttpStatus.BAD_REQUEST);
      }
      if (userId === '@10times.com') {
        userId = (await this.prisma.user.findMany({
          where: {
            email: { contains: '@10times.com', mode: 'insensitive' }
          }
        }))[0].id;
        sourceId = userId;
      }
      const processEnumObject: object = {
        SEND_SIGN_UP_IN_EMAIL: 'signUp/InEmail',
        SEND_EVENT_CANCEL_EMAIL: 'eventCancelMail',
        SEND_PROMOTED_EVENT_INVITAION_EMAIL: 'invitationMail',
        SEND_TRACKER_ACCESS_EMAIL: 'shareAccess',
        SEND_EVENT_INTEND_CAPTURE_EMAIL: 'intendRecevied',
        SEND_EVENT_INTEND_UPDATE_EMAIL: 'intendUpdate',
        SEND_ERROR_EMAIL: 'errorMessage',
        SEND_DEMO_CONTACT_EMAIL: 'demoContactMail',
        SEND_USER_INVITATION_EMAIL:'inviteUserMail'
      };
      const processToprocessorMapping: object = {
        shareAccess: 'accessProcessor',
        eventCancelMail: 'eventProcessor',
        invitationMail: 'inviteProcessor',
        inviteUserMail:'inviteProcessor',
        'signUp/InEmail': 'otpProcessor',
        intendRecevied: 'intendProcessor',
        intendUpdate: 'intendProcessor',
        errorMessage: 'errorProcessor',
        demoContactMail: 'demoContactProcessor'
      };
      const jobSource: object = {
        // SEND_SIGNIN_OTP: 'signUp/InEmail',
        // SEND_SIGNUP_OTP: 'signUp/InEmail',
        SEND_ACCESS: 'shareAccess',
        EVENT_CANCEl: 'eventCancelMail',
        SEND_INVITE: 'invitationMail',
        SEND_USER_INVITE:'inviteUserMail',
        SEND_INTEND_CREATE: 'intendRecevied',
        SEND_INTEND_UPDATE: 'intendUpdate',
        SEND_ERROR_MAIL: 'errorMessage',
        SEND_DEMO_CONTACT_MAIL: 'demoContactMail'
      }
      const process: string = processEnumObject[processAction];
      const processor: string = processToprocessorMapping[process];
      console.log(process, processor);

      let jobSourceType: string = process === 'signUp/InEmail' && jobRequestPayload.process === 'sign-up' ? 'SEND_SIGNUP_OTP'
        : (process === 'signUp/InEmail' && jobRequestPayload.process === 'sign-in' ? 'SEND_SIGNUP_OTP' : '');
      for (const key in jobSource) {
        if (jobSource[key] === process) {
          jobSourceType = key;
          break;
        }
      }
      const requestId = (await this.createJobInDatabase(
        userId,
        validatedPayload,
        jobSourceType as JobSource,
        sourceId
      ));
      let jobAdded: any = {};
      switch (process) {
        case 'shareAccess':
          jobAdded = await this.accessQueue.add(
            process,
            {
              ...validatedPayload,
              ...requestId
            },
            {
              priority: priority,
            },
          );
          console.log('Call accessProcessor');
          break;
        case 'eventCancelMail':
          jobAdded = await this.eventCanelQueue.add(
            process,
            {
              ...validatedPayload, ...requestId
            },
            {
              priority: priority,
            },
          );
          console.log('Call eventProcessor');
          break;
        case 'invitationMail':
          jobAdded = await this.inviteQueue.add(
            process,
            {
              ...validatedPayload, ...requestId
            },
            {
              priority: priority,
            },
          );
          console.log('Call inviteProcessor');
          break;
        case 'inviteUserMail':
          jobAdded = await this.inviteQueue.add(
            process,
            {
              ...validatedPayload, ...requestId
            },
            {
              priority: priority,
            },
          );
          console.log('Call inviteProcessor');
          break;
        case 'signUp/InEmail':
          jobAdded = await this.otpQueue.add(
            process,
            {
              ...validatedPayload, ...requestId
            },
            {
              priority: priority,
            },
          );
          console.log('Call otpProcessor');
          break;
        case 'intendRecevied':
          jobAdded = await this.intendQueue.add(
            process,
            {
              ...validatedPayload, ...requestId
            },
            {
              priority: priority,
              attempts: 5,
            },
          );
          console.log('Call intendProcessor');
          break;
        case 'intendUpdate':
          jobAdded = await this.intendQueue.add(
            process,
            {
              ...validatedPayload, ...requestId
            },
            {
              priority: priority,
            },
          );
          console.log('Call intendProcessor');
          break;
        case 'demoContactMail':
          jobAdded = await this.demoContactQueue.add(
            process,
            {
              ...validatedPayload, ...requestId
            },
            {
              priority: priority,
            },
          );
          console.log('Call intendProcessor');
          break;
        case 'errorMessage':
          jobAdded = await this.errorQueue.add(
            process,
            {
              ...validatedPayload, ...requestId
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
      if (jobAdded && jobAdded.id) {
        this.updateJobInDatabase(jobAdded.id, String(requestId.jobRequestId));
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
    sourceId: string
  ) {
    const job = await this.prisma.requestedJob.create({
      data: {
        userId: String(userId),
        inputData: payload,
        source: source,
        sourceId: sourceId
      },
      select: {
        id: true,
      },
    });
    return { jobRequestId: job.id };
  }
  private async updateJobInDatabase(
    processId: number,
    jobId: string
  ) {
    const job = await this.prisma.requestedJob.update({
      where: {
        id: jobId
      },
      data: {
        processId: Number(processId)
      },
      select: {
        id: true,
      },
    });
    return { jobRequestId: job.id };
  }
}
