import { PrismaService } from 'src/prisma/prisma.service';
import { Inject, Logger, Scope } from '@nestjs/common';
import { BullStatus, JobStatus, User } from '@prisma/client';
import { CachedUser, LastActive, TrackerParamsOptions } from 'src/shared/types';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { Processor, Process, JOB_REF } from '@nestjs/bull';
import { EmailService } from '../email/email.service';
import {
  emailSenderAddress,
  eventCancelMailToAdminHtml,
  eventCancelMailToUsersHtml,
} from '../email/email.template';
interface EventCancelData {
  email: string[];
  eventName: any;
  userId: string;
  userEmail: string;
  jobRequestId: string;
}
@Processor({ name: 'eventProcessor', scope: Scope.REQUEST })
export class EventWorkerClass {
  constructor(
    private email: EmailService,
    private prisma: PrismaService,
    @Inject(JOB_REF) jobRef: Job,

    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private configService: ConfigService,
  ) {
    console.log(JSON.stringify(jobRef));
  }
  private readonly logger = new Logger(EventWorkerClass.name);
  @Process('eventCancelMail')
  async handleEmailJob(job: Job<EventCancelData>) {
    try {
      const jobdata = job.data;

      const update = await this.prisma.requestedJob.update({
        where: {
          id: jobdata.jobRequestId,
        },
        data: {
          status: 'PROCESSING',
        },
      });

      const eventCancelAdminEmailTemplate = eventCancelMailToAdminHtml
        .replace('{to}', jobdata.userEmail)
        .replace('{from}', emailSenderAddress)
        .replace('{FRONTEND_URL}', process.env.FRONTEND_URL)
        .replaceAll('{eventName}', jobdata.eventName);
      const { data, error } = await this.email.mailSender(
        jobdata.userEmail,
        emailSenderAddress,
        `Event Canceled: ${jobdata.eventName}`,
        eventCancelAdminEmailTemplate,
      );
      let status = 'COMPLETED' as JobStatus;
      if (error) {
        status = 'FAILED' as JobStatus;
      }
      const completeOrnot = await this.prisma.requestedJob.update({
        where: {
          id: update.id,
        },
        data: {
          status: status,
        },
      });

      if (jobdata.email.length > 0) {
        const create = await this.prisma.requestedJob.create({
          data: {
            inputData: {
              userEmail: jobdata.email,
              eventData: jobdata.eventName,
            } as any,
            source: 'EVENT_CANCEl',
            status: 'PROCESSING',
            user: { connect: { id: jobdata.userId } },
          },
        });
        const eventCancelEmailTemplate = eventCancelMailToUsersHtml
          .replace('{FRONTEND_URL}', process.env.FRONTEND_URL)
          .replaceAll('{eventName}', jobdata.eventName);
        const { data, error } = await this.email.multiMailSender(
          jobdata.email,
          emailSenderAddress,
          `Event Canceled: ${jobdata.eventName}`,
          eventCancelEmailTemplate,
        );
        status = 'COMPLETED' as JobStatus;
        if (error) {
          status = 'FAILED' as JobStatus;
        }
        const completeOrnot1 = await this.prisma.requestedJob.update({
          where: {
            id: create.id,
          },
          data: {
            status: status,
          },
        });
      }

      return {};
    } catch (error) {
      console.log(JSON.stringify(error));
      const data = await this.prisma.requestedJob.update({
        where: {
          id: job.data.jobRequestId,
        },
        data: {
          status: 'FAILED',
        },
      });
    }
  }
}
