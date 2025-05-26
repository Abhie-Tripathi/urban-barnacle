import { JOB_REF, Process, Processor } from '@nestjs/bull';
import { Inject, Logger, Scope } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Job } from 'bull';
import { emailSenderAddress } from '../email/email.template';
import { JobStatus } from '@prisma/client';

@Processor({ name: '{demoContactProcessor}', scope: Scope.REQUEST })
export class DemoContactWorkerClass {
  constructor(
    private email: EmailService,
    private prisma: PrismaService,
    @Inject(JOB_REF) jobRef: Job,
  ) {
    console.log(JSON.stringify(jobRef));
  }
  private readonly logger = new Logger(DemoContactWorkerClass.name);
  @Process(`{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}demoContactProcessor}`)
  async handleEmailJob(
    job: Job<{ body: string; subject: string; jobRequestId: string }>,
  ) {
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

      const { data, error } = await this.email.multiMailSender(
        (process.env.DEMO_MAIL_RECIPIENTS || '').split(','),
        emailSenderAddress,
        jobdata.subject,
        jobdata.body,
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
