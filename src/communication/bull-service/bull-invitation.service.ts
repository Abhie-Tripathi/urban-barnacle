import { PrismaService } from 'src/prisma/prisma.service';
import { Inject, Logger, Scope } from '@nestjs/common';
import { JobStatus, User } from '@prisma/client';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { Processor, Process, JOB_REF } from '@nestjs/bull';
import { EmailService } from '../email/email.service';
import {
  emailSenderAddress,
  eventCancelMailToUsersHtml,
  inviteEmailToEventHtml,
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
}
@Processor({ name: 'inviteProcessor', scope: Scope.REQUEST })
export class InvitationWorkerClass {
  constructor(
    private email: EmailService,
    private prisma: PrismaService,
    @Inject(JOB_REF) jobRef: Job,

    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private configService: ConfigService,
  ) {
    console.log(JSON.stringify(jobRef));
  }
  private readonly logger = new Logger(InvitationWorkerClass.name);
  @Process('invitationMail')
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
        .replace('{start_time}', jobdata.eventStartDate)
        .replace('{end_time}', jobdata.eventEndDate)
        .replace('{location}', jobdata.eventLocation)
        .replace('{redirectUrl}', jobdata.eventRedirectUrl)
        .replace('{FRONTEND_URL}', process.env.FRONTEND_URL ?? '')
        .replaceAll('{eventName}', jobdata.eventName)
        .replaceAll('{encryptYes}', jobdata.encryptYes)
        .replaceAll('{encryptNo}', jobdata.encryptNo);
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
