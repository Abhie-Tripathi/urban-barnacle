import { PrismaService } from 'src/prisma/prisma.service';
import { Inject, Logger, Scope } from '@nestjs/common';
import { JobStatus, User } from '@prisma/client';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Processor, JOB_REF, WorkerHost } from '@nestjs/bullmq';
import { EmailService } from '../email/email.service';
import {
  emailSenderAddress,
  eventCancelMailToUsersHtml,
  inviteEmailToEventHtml,
  inviteUserEmailTemplate,
} from '../email/email.template';
interface InviteData {
  userEmail: string;
  eventName: string;
  eventStartDate: string;
  eventEndDate: string;
  eventLocation: string;
  eventRedirectUrl: string;
  jobRequestId: string;
  encryptYes: string;
  encryptNo: string;
  sourceId: string;
}
@Processor(`{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}inviteProcessor}`)
export class InvitationWorkerClass extends WorkerHost {
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
  private readonly logger = new Logger(InvitationWorkerClass.name);
  async process(job: Job<any>): Promise<any> {
    await job.log(`Started processing job: ${job.name}`);
    await job.log(`Job data: ${JSON.stringify(job.data)}`);
    switch (job.name) {
      case 'invitationMail': {
        const { done } = await this.handleEmailJob(job);
        await job.log(`Finished processing job: ${job.name}`);
        return { done };
      }
      case 'inviteUserMail': {
        const { done } = await this.handleInviteEmailJob(job);
        await job.log(`Finished processing job: ${job.name}`);
        return { done };
      }
      default: {
        await job.log(` Not Finished processing job(NOT FOUND): ${job.name}`);
      }
    }
    return { done: false };
  }
  // @Process('invitationMail')
  async handleEmailJob(job: Job<InviteData>) {
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
      const date: string[] = (new Date(jobdata.eventStartDate) + '').split(' ');
      const inviteEmailToEventTemplate = inviteEmailToEventHtml
        .replaceAll('{date[2]}', date[2])
        .replaceAll('{date[1]}', date[1])
        .replaceAll('{date[0]}', date[0])
        .replaceAll('{start_time}', jobdata.eventStartDate)
        .replaceAll('{end_time}', jobdata.eventEndDate)
        .replaceAll('{location}', jobdata.eventLocation)
        .replaceAll('{redirectUrl}', jobdata.eventRedirectUrl)
        .replaceAll('{FRONTEND_URL}', process.env.FRONTEND_URL ?? '')
        .replaceAll('{eventName}', jobdata.eventName)
        .replaceAll('{encryptYes}', jobdata.encryptYes)
        .replaceAll('{encryptNo}', jobdata.encryptNo);
      console.log(inviteEmailToEventTemplate);
      const { data, error } = await this.email.mailSender(
        jobdata.userEmail,
        emailSenderAddress,
        `You are invited to ${jobdata.eventName}`,
        inviteEmailToEventTemplate,
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
  // @Process('inviteUserMail')
  async handleInviteEmailJob(
    job: Job<{
      jobRequestId: string;
      invitedUserName: string;
      referredByUserName: string;
      invitedUserEmail: string;
    }>,
  ) {
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
      const inviteEmailToEventTemplate = inviteUserEmailTemplate
        .replaceAll('{invitedUserName}', jobdata.invitedUserName)
        .replaceAll('{referredByUserName}', jobdata.referredByUserName);
      console.log(inviteEmailToEventTemplate);
      const { data, error } = await this.email.mailSender(
        jobdata.invitedUserEmail,
        emailSenderAddress,
        `${jobdata.referredByUserName} has invited you on Whr`,
        inviteEmailToEventTemplate,
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
      return { done: false };
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
