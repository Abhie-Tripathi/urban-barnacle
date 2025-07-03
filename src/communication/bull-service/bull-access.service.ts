import { PrismaService } from 'src/prisma/prisma.service';
import { Inject, Logger, Scope } from '@nestjs/common';
import { JobStatus, User } from '@prisma/client';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Processor, JOB_REF, WorkerHost } from '@nestjs/bullmq';
import { EmailService } from '../email/email.service';
import { emailSenderAddress, trackerAccessHtml } from '../email/email.template';
interface AccessEmailData {
  accessMetaData: UserMetaData;
  redirectUrl: string;
  trackerName: string;
  jobRequestId: string;
  sourceId: string;
}
interface UserMetaData {
  givenToUserEmail: string;
  givenByUserEmail: string;
  givenByUserDesignation: string;
  givenToUserName: string;
  givenByUserName: string;
}
@Processor(`{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}accessProcessor}`)
export class AccessEmailWorkerClass extends WorkerHost {
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
  private readonly logger = new Logger(AccessEmailWorkerClass.name);
  async process(job: Job<any>): Promise<any> {
    await job.log(`Started processing job: ${job.name}`);
    await job.log(`Job data: ${JSON.stringify(job.data)}`);
    switch (job.name) {
      case 'shareAccess': {
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
  async handleEmailJob(job: Job<AccessEmailData>) {
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
      const userData = jobdata.accessMetaData;
      const trackerAccessTemplate = trackerAccessHtml
        .replace('{givenToUserName}', userData.givenToUserName)
        .replace('{givenByUserDesignation}', userData.givenByUserDesignation)
        .replace('{givenByUserEmail}', userData.givenByUserEmail)
        .replace('{givenByUserName}', userData.givenByUserName)
        .replace('{givenToUserEmail}', userData.givenToUserEmail)
        .replace('{redirectUrl}', jobdata.redirectUrl);

      const { data, error } = await this.email.mailSender(
        userData.givenToUserEmail,
        emailSenderAddress,
        `Invitation to use tracker - ${jobdata.trackerName}`,
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
