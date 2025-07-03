import { PrismaService } from 'src/prisma/prisma.service';
import { Inject, Logger, Scope } from '@nestjs/common';
import { JobStatus, User } from '@prisma/client';
import { Job } from 'bullmq';
import { Processor, JOB_REF, WorkerHost } from '@nestjs/bullmq';
import { EmailService } from '../email/email.service';
import {
  emailSenderAddress,
  intendInterestOwnerHtml,
  intendShowedInterestHtml,
} from '../email/email.template';
interface intendCaptureData {
  userShowedInterestName: string;
  userShowedInterestEmail: string;
  eventOwnerEmail: string;
  eventOwnerName: string;
  eventName: string;
  pending: string;
  going: string;
  waitlist: string;
  inviteCount: string;
  eventStartDate: string;
  eventEndDate: string;
  eventLocation: string;
  userShowedInterestType: string;
  eventRedirectUrl: string;
  jobRequestId: string;
  sourceId: string;
}
interface intendUpdateData {
  userShowedInterestName: string;
  userShowedInterestEmail: string;
  eventName: string;
  eventStartDate: string;
  eventEndDate: string;
  eventLocation: string;
  userShowedInterestType: string;
  eventRedirectUrl: string;
  jobRequestId: string;
  sourceId: string;
}
@Processor(`{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}intendProcessor}`)
export class IntendWorkerClass extends WorkerHost {
  constructor(
    private email: EmailService,
    private prisma: PrismaService,
    @Inject(JOB_REF) jobRef: Job,
  ) {
    super();
    console.log(JSON.stringify(jobRef));
  }
  private readonly logger = new Logger(IntendWorkerClass.name);
  async process(job: Job<any>): Promise<any> {
    await job.log(`Started processing job: ${job.name}`);
    await job.log(`Job data: ${JSON.stringify(job.data)}`);
    switch (job.name) {
      case 'intendRecevied': {
        const { done } = await this.handleEmailJob(job);
        await job.log(`Finished processing job: ${job.name}`);
        return { done };
      }
      case 'intendUpdate': {
        const { done } = await this.handleUpdateEmailJob(job);
        await job.log(`Finished processing job: ${job.name}`);
        return { done };
      }
      default: {
        await job.log(` Not Finished processing job(NOT FOUND): ${job.name}`);
      }
    }
    return { done: false };
  }
  // @Process('intendRecevied')
  async handleEmailJob(job: Job<intendCaptureData>) {
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
      const intendInterestOwnerEmailTemplate = intendInterestOwnerHtml
        .replaceAll('{userShowedInterestName}', jobdata.userShowedInterestName)
        .replaceAll('{pending}', jobdata.pending)
        .replaceAll('{going}', jobdata.going)
        .replaceAll('{waitlist}', jobdata.waitlist)
        .replaceAll('{inviteCount}', jobdata.inviteCount)
        .replaceAll('{FRONTEND_URL}', process.env.FRONTEND_URL ?? '')
        .replaceAll('{eventName}', jobdata.eventName);

      const date: string[] = (new Date(jobdata.eventStartDate) + '').split(' ');
      let secondLine: string = '';
      let subjectLine: string = `Thank you for your interest in ${jobdata.eventName}!`;
      if (jobdata.userShowedInterestType === 'PENDING') {
        secondLine = 'pending approval';
        subjectLine = `Registration pending approval for ${jobdata.eventName}`;
      }
      if (jobdata.userShowedInterestType === 'WAITLISTING') {
        secondLine = 'on the waitlist';
        subjectLine = `You are on waitlist for ${jobdata.eventName}`;
      }
      if (jobdata.userShowedInterestType === 'FOLLOWING') {
        secondLine = 'following';
        subjectLine = `Thank you for following ${jobdata.eventName}`;
      }
      //   start_time
      //   end_time
      //   location
      //   redirectUrl
      const intendShowedInterestEmailTemplate = intendShowedInterestHtml
        .replaceAll('{userShowedName}', jobdata.userShowedInterestName)
        .replaceAll('{secondLine}', secondLine)
        .replaceAll('{date[2]}', date[2])
        .replaceAll('{date[1]}', date[1])
        .replaceAll('{date[0]}', date[0])
        .replaceAll('{start_time}', jobdata.eventStartDate)
        .replaceAll('{end_time}', jobdata.eventEndDate)
        .replaceAll('{location}', jobdata.eventLocation)
        .replaceAll('{redirectUrl}', jobdata.eventRedirectUrl)
        .replaceAll('{FRONTEND_URL}', process.env.FRONTEND_URL ?? '')
        .replaceAll('{eventName}', jobdata.eventName);
      const [{ data, error }, userExternal] = await Promise.all([
        this.email.mailSender(
          jobdata.eventOwnerEmail,
          emailSenderAddress,
          `New Interest for ${jobdata.eventName}!`,
          intendInterestOwnerEmailTemplate,
        ),
        this.email.mailSender(
          jobdata.userShowedInterestEmail,
          emailSenderAddress,
          subjectLine,
          intendShowedInterestEmailTemplate,
        ),
      ]);
      let status = 'COMPLETED' as JobStatus;
      if (error || userExternal.error) {
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
  // @Process('intendUpdate')
  async handleUpdateEmailJob(job: Job<intendUpdateData>) {
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
      const secondLine: object = {
        CONFIRMED: 'Approved',
        REJECTED: 'Not Accepted',
        PENDING: 'Approval Pending',
        WAITLISTING: 'on Waitlist',
      };
      const intendShowedInterestEmailTemplate = intendShowedInterestHtml
        .replaceAll('{userShowedName}', jobdata.userShowedInterestName)
        .replaceAll('{secondLine}', secondLine[jobdata.userShowedInterestType])
        .replaceAll('{date[2]}', date[2])
        .replaceAll('{date[1]}', date[1])
        .replaceAll('{date[0]}', date[0])
        .replaceAll('{start_time}', jobdata.eventStartDate)
        .replaceAll('{end_time}', jobdata.eventEndDate)
        .replaceAll('{location}', jobdata.eventLocation)
        .replaceAll('{redirectUrl}', jobdata.eventRedirectUrl)
        .replaceAll('{FRONTEND_URL}', process.env.FRONTEND_URL ?? '')
        .replaceAll('{eventName}', jobdata.eventName);
      const [{ data, error }] = await Promise.all([
        this.email.mailSender(
          jobdata.userShowedInterestEmail,
          emailSenderAddress,
          `Registration Update: ${jobdata.eventName}!`,
          intendShowedInterestEmailTemplate,
        ),
      ]);
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
