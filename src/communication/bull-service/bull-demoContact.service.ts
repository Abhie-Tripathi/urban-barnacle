import { JOB_REF, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger, Scope } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Job } from 'bullmq';
import { emailSenderAddress } from '../email/email.template';
import { JobStatus } from '@prisma/client';

@Processor(`{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}demoContactProcessor}`)
export class DemoContactWorkerClass extends WorkerHost {
  constructor(
    private email: EmailService,
    private prisma: PrismaService,
    @Inject(JOB_REF) jobRef: Job,
  ) {
    super();
    console.log(JSON.stringify(jobRef));
  }
  private readonly logger = new Logger(DemoContactWorkerClass.name);
  async process(job: Job<any>): Promise<any> {
    await job.log(`Started processing job: ${job.name}`);
    await job.log(`Job data: ${JSON.stringify(job.data)}`);
    switch (job.name) {
      case 'demoContact': {
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
  // @Process(`{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}demoContactProcessor}`)
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
