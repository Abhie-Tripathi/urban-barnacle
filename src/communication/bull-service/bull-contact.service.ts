import { PrismaService } from 'src/prisma/prisma.service';
import { Inject, Logger, Scope } from '@nestjs/common';
import { JobStatus, User } from '@prisma/client';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { Processor, Process, JOB_REF } from '@nestjs/bull';
import { EmailService } from '../email/email.service';
import { contactUsEmailTemplate, demoContactEmailTemplate, emailSenderAddress, trackerAccessHtml } from '../email/email.template';
interface DemoContactJob {
    firstName: string;
    lastName: string;
    email: string;
    companyName: string;
    jobTitle: string;
    phoneNumber: string;
    jobRequestId: string;
}
interface ContactUsJob {
    firstName: string;
    lastName: string;
    email: string;
    message: string;
    jobRequestId: string;
}
@Processor({ name: 'contactProcessor', scope: Scope.REQUEST })
export class ContactWorkerClass {
    constructor(
        private email: EmailService,
        private prisma: PrismaService,
        @Inject(JOB_REF) jobRef: Job,

        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
        private configService: ConfigService,
    ) {
        console.log(JSON.stringify(jobRef));
    }
    private readonly logger = new Logger(ContactWorkerClass.name);
    @Process('demoContactMail')
    async demoContactHandleEmailJob(job: Job<DemoContactJob>) {
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
            const demoContactEmail = demoContactEmailTemplate
                .replaceAll('{firstName}', jobdata.firstName)
                .replaceAll('{lastName}', jobdata.lastName)
                .replaceAll('{email}', jobdata.email)
                .replaceAll('{companyName}', jobdata.companyName)
                .replaceAll('{jobTitle}', jobdata.jobTitle)
                .replaceAll('{phoneNumber}', jobdata.phoneNumber);
            // console.log({
            //     email: (process.env.DEMO_MAIL_RECIPIENTS || '').split(','),
            //     emailSenderAddress: emailSenderAddress,
            //     sub: 'Booking slot for Demo of Whr.ai',
            //     demoContactEmail: demoContactEmail
            // });

            const { data, error } = await this.email.multiMailSender(
                (process.env.DEMO_MAIL_RECIPIENTS || '').split(','),
                emailSenderAddress,
                'Booking slot for Demo of Whr.ai',
                demoContactEmail,
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
    @Process('contactUsMail')
    async contactUsHandleEmailJob(job: Job<ContactUsJob>) {
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
            const contactUsEmail = contactUsEmailTemplate
                .replaceAll('{firstName}', jobdata.firstName)
                .replaceAll('{lastName}', jobdata.lastName)
                .replaceAll('{email}', jobdata.email)
                .replaceAll('{message}', jobdata.message);

            const { data, error } = await this.email.multiMailSender(
                (process.env.DEMO_MAIL_RECIPIENTS || '').split(','),
                emailSenderAddress,
                'Reaching out for Demo of Whr.ai',
                contactUsEmail,
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
