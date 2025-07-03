import { PrismaService } from 'src/prisma/prisma.service';
import { Inject, Logger, Scope } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Processor, JOB_REF, WorkerHost } from '@nestjs/bullmq';
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
  sourceId: string;
}
@Processor(`{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}eventProcessor}`)
export class EventWorkerClass extends WorkerHost {
  constructor(
    private email: EmailService,
    private prisma: PrismaService,
    @Inject(JOB_REF) jobRef: Job,

    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private configService: ConfigService,
  ) {
    super();
    console.log(JSON.stringify(jobRef));
  }
  private readonly logger = new Logger(EventWorkerClass.name);
  async process(job: Job<any>): Promise<any> {
    await job.log(`Started processing job: ${job.name}`);
    await job.log(`Job data: ${JSON.stringify(job.data)}`);
    switch (job.name) {
      case 'eventCancelMail': {
        const { done } = await this.handleEmailJob(job);
        await job.log(`Finished processing job: ${job.name}`);
        return { done };
      }
      default: {
        await job.log(` Not Finished processing job(NOT FOUND): ${job.name}`);
      }
    }
    return { done: false };
  }
  // @Process('eventCancelMail')
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
        .replace('{FRONTEND_URL}', process.env.FRONTEND_URL ?? '')
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
            sourceId: jobdata.sourceId,
          },
        });
        const eventCancelEmailTemplate = eventCancelMailToUsersHtml
          .replace('{FRONTEND_URL}', process.env.FRONTEND_URL ?? '')
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

      return { done: true };
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
      return { done: false };
    }
  }
}
