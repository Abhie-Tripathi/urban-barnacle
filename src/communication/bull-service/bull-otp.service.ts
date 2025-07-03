import { PrismaService } from 'src/prisma/prisma.service';
import { Inject, Logger, Scope } from '@nestjs/common';
import { JobStatus, User } from '@prisma/client';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Processor, JOB_REF, WorkerHost } from '@nestjs/bullmq';
import { EmailService } from '../email/email.service';
import { emailSenderAddress, signUpINEmailHtml } from '../email/email.template';
interface OtpEmailData {
  otp: string;
  userInfo: any;
  process: string;
  jobRequestId: string;
  sourceId: string;
}
@Processor(`{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}otpProcessor}`, { useWorkerThreads: true, concurrency: 10 })
export class OtpEmailWorkerClass extends WorkerHost {
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
  private readonly logger = new Logger(OtpEmailWorkerClass.name);
  async process(job: Job<any>): Promise<any> {
    await job.log(`Started processing job: ${job.name}`);
    await job.log(`Job data: ${JSON.stringify(job.data)}`);
    switch (job.name) {
      case 'signUp/InEmail': {
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
  // @Process('signUp/InEmail')
  async handleEmailJob(job: Job<OtpEmailData>) {
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
      const userData = jobdata.userInfo;
      const signUpEmailTemplate = signUpINEmailHtml
        .replace('{to}', userData.email)
        .replace('{from}', emailSenderAddress)
        .replace('{user.firstname}', userData.firstname)
        .replace('{otp}', jobdata.otp)
        .replace('{sign}', jobdata.process);

      const { data, error } = await this.email.mailSender(
        userData.email,
        emailSenderAddress,
        'WHR OTP - ' + jobdata.otp,
        signUpEmailTemplate,
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
