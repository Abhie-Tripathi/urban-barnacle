import { PrismaService } from 'src/prisma/prisma.service';
import { Inject, Logger, Scope } from '@nestjs/common';
import { JobStatus, User } from '@prisma/client';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { Processor, Process, JOB_REF } from '@nestjs/bull';
import { EmailService } from '../email/email.service';
import { emailSenderAddress, signUpINEmailHtml } from '../email/email.template';
interface OtpEmailData {
  otp: string;
  userInfo: any;
  process: string;
  jobRequestId: string;
}
@Processor({ name: 'otpProcessor', scope: Scope.REQUEST })
export class OtpEmailWorkerClass {
  constructor(
    private email: EmailService,
    private prisma: PrismaService,
    @Inject(JOB_REF) jobRef: Job,

    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private configService: ConfigService,
  ) {
    console.log(JSON.stringify(jobRef));
  }
  private readonly logger = new Logger(OtpEmailWorkerClass.name);
  @Process('signUp/InEmail')
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
        'OTP',
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
