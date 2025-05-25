import { JOB_REF, Process, Processor } from '@nestjs/bull';
import { Inject, Logger, Scope } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Job } from 'bull';
import { JobStatus } from '@prisma/client';
import { emailSenderAddress, errorTemplate } from '../email/email.template';

@Processor({ name: '{errorProcessor}', scope: Scope.REQUEST })
export class ErrorWorkerClass {
  constructor(
    private email: EmailService,
    private prisma: PrismaService,
    @Inject(JOB_REF) jobRef: Job,
  ) {
    console.log(JSON.stringify(jobRef));
  }
  private readonly logger = new Logger(ErrorWorkerClass.name);
  @Process('errorMessage')
  async handleEmailJob(job: Job<{ data: object; jobRequestId: string }>) {
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
      return {};
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
    }
  }
}
