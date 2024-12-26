import { PrismaService } from 'src/prisma/prisma.service';
import { Inject, Logger, Scope } from '@nestjs/common';
import { BullStatus, User } from '@prisma/client';
import { CachedUser, LastActive, TrackerParamsOptions } from 'src/shared/types';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { EmailService } from 'src/email/email.service';
import { emailSenderAddress, signUpEmail } from 'src/email/email.template';
import { Job } from 'bull';
import { Processor, Process, JOB_REF } from '@nestjs/bull';
interface OtpEmailData {
  otp: string;
  userInfo: any;
  process: string;
}
interface Rest {
  token: string;
  user: CachedUser;
  from: string;
}
interface AccessTracker {
  givenBy: string;
  givenTo: string;
  trackerId: string;
  accessType: string;
  redirect: string;
  token: string;
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
      const upadte = await this.prisma.verification.update({
        where: {
          userId: jobdata.userInfo.id,
        },
        data: {
          status: 'PROCESSING',
        },
      });
      const userData = jobdata.userInfo;
      const signUpEmailTemplate = JSON.stringify(signUpEmail)
        .replace('{to}', userData.email)
        .replace('{from}', emailSenderAddress)
        .replace('{user.firstname}', userData.firstname)
        .replace('{otp}', jobdata.otp)
        .replace('{sign}', jobdata.process);

      const { data, error } = await this.email.otpMail(
        jobdata.otp,
        JSON.parse(signUpEmailTemplate),
      );
      let status = 'COMPLETED' as BullStatus;
      if (error) {
        status = 'FAILED' as BullStatus;
      }
      const completeOrnot = await this.prisma.verification.update({
        where: {
          userId: userData.userId,
        },
        data: {
          status: status,
        },
      });
      return {};
    } catch (error) {
      console.log(JSON.stringify(error));

      const data = await this.prisma.verification.update({
        where: {
          userId: job.data.userInfo.id,
        },
        data: {
          status: 'FAILED',
        },
      });
    }
  }
}
