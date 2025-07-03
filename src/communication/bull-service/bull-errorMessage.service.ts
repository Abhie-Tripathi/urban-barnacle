import { JOB_REF, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger, Scope } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Job } from 'bullmq';
import { JobStatus } from '@prisma/client';
import { contactApiLimitReachedTemplate, emailSenderAddress, errorTemplate } from '../email/email.template';

@Processor(`{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}errorProcessor}`)
export class ErrorWorkerClass extends WorkerHost {
  constructor(
    private email: EmailService,
    private prisma: PrismaService,
    @Inject(JOB_REF) jobRef: Job,
  ) {
    super();
    console.log(JSON.stringify(jobRef));
  }
  private readonly logger = new Logger(ErrorWorkerClass.name);
  async process(job: Job<any>): Promise<any> {
    await job.log(`Started processing job: ${job.name}`);
    await job.log(`Job data: ${JSON.stringify(job.data)}`);
    switch (job.name) {
      case 'errorMessage': {
        const { done } = await this.processErrorMails(job);
        await job.log(`Finished processing job: ${job.name}`);
        return { done };
      }
      case 'errorContactLimitMessage': {
        const { done } = await this.processErrorMails(job);
        await job.log(`Finished processing job: ${job.name}`);
        return { done };
      }
      default: {
        await job.log(` Not Finished processing job(NOT FOUND): ${job.name}`);
      }
    }
    return { done: false };
  }
  async processErrorMails(job: Job<any>) {
    try {
      const jobdata = job.data;
      const upadte = await this.prisma.requestedJob.update({
        where: {
          id: jobdata.jobRequestId,
        },
        data: {
          status: 'PROCESSING',
        },
      });
      console.log(jobdata);
      const trackerAccessTemplate = errorTemplate
        .replace('{api_name}', jobdata['apiName'])
        .replace('{error_type}', jobdata['errorType'])
        .replace('{error_message}', jobdata['errorMessage'])
        .replace('{timestamp}', new Date().toUTCString());

      const { data, error } = await this.email.multiMailSender(
        (process.env.ERROR_MAIL_RECIPIENTS || '').split(','),
        emailSenderAddress,
        `An error occurred in ${process.env.BACKEND} ${process.env.NODE_ENV || ''} API service`,
        trackerAccessTemplate,
      );
      let status = 'COMPLETED' as JobStatus;
      if (error) {
        status = 'FAILED' as JobStatus;
      }
      const completeOrnot = await this.prisma.requestedJob.update({
        where: {
          id: jobdata.jobRequestId,
        },
        data: {
          status: status,
        },
      });
      return { done: true };
    } catch (error) {
      console.log(JSON.stringify(error), error);
      console.error(error);
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
  // @Process('errorContactLimitMessage')
  async contactHandleEmailJob(job: Job<{
    email: string;
    userLimit: string;
    dailyLimit: string;
    time: string;
    name: string;
    jobRequestId: string
  }>) {
    try {
      const jobdata = job.data;
      const upadte = await this.prisma.requestedJob.update({
        where: {
          id: jobdata.jobRequestId,
        },
        data: {
          status: 'PROCESSING',
        },
      });
      console.log(jobdata);
      const contactApiLimitReachedMail = contactApiLimitReachedTemplate
        .replaceAll('{name}', jobdata['name'])
        .replaceAll('{email}', jobdata['email'])
        .replaceAll('{userLimit}', jobdata['userLimit'])
        .replaceAll('{dailyLimit}', jobdata['dailyLimit'])
        .replaceAll('{time}', jobdata['time']);

      const { data, error } = await this.email.multiMailSender(
        (process.env.ERROR_MAIL_RECIPIENTS || '').split(','),
        emailSenderAddress,
        `Contact Limit Reached in ${process.env.BACKEND} ${process.env.NODE_ENV || ''} API service`,
        contactApiLimitReachedMail,
      );
      let status = 'COMPLETED' as JobStatus;
      if (error) {
        status = 'FAILED' as JobStatus;
      }
      const completeOrnot = await this.prisma.requestedJob.update({
        where: {
          id: jobdata.jobRequestId,
        },
        data: {
          status: status,
        },
      });
      return { done: true };
    } catch (error) {
      console.log(JSON.stringify(error), error);
      console.error(error);
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

