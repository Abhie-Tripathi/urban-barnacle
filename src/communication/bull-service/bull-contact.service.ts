import { PrismaService } from 'src/prisma/prisma.service';
import { Inject, Logger, Scope } from '@nestjs/common';
import { JobStatus, User } from '@prisma/client';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Processor, JOB_REF, WorkerHost } from '@nestjs/bullmq';
import { EmailService } from '../email/email.service';
import { contactUsEmailTemplate, demoContactEmailTemplate, emailSenderAddress, trackerAccessHtml } from '../email/email.template';
interface DemoContactJob {
    firstName: string;
    lastName: string;
    email: string;
    companyName: string;
    jobTitle: string;
    phoneNumber: string;
    source: string;
    jobRequestId: string;
}
interface ContactUsJob {
    firstName: string;
    lastName: string;
    email: string;
    message: string;
    source: string;
    jobRequestId: string;
}

@Processor(`{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}contactProcessor}`)
export class ContactWorkerClass extends WorkerHost {
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
    private readonly logger = new Logger(ContactWorkerClass.name);
    async process(job: Job<any>): Promise<any> {
        console.log("asasdsazsdfdtuhrt");

        await job.log(`Started processing job: ${job.name}`);
        await job.log(`Job data: ${JSON.stringify(job.data)}`);
        switch (job.name) {
            case 'demoContactMail': {
                const { done } = await this.demoContactHandleEmailJob(job);
                await job.log(`Finished processing job: ${job.name}`);
                return { done };
            }
            case 'contactUsMail': {
                const { done } = await this.contactUsHandleEmailJob(job);
                await job.log(`Finished processing job: ${job.name}`);
                return { done };
            }
            default: {
                await job.log(` Not Finished processing job(NOT FOUND): ${job.name}`);
            }
        }
        return { done: false };
    }
    // @Process('demoContactMail')
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
                .replaceAll('{phoneNumber}', jobdata.phoneNumber)
                .replaceAll('{Source}', jobdata.source);
            // console.log({
            //     email: (process.env.DEMO_MAIL_RECIPIENTS || '').split(','),
            //     emailSenderAddress: emailSenderAddress,
            //     sub: 'Booking slot for Demo of Whr.ai',
            //     demoContactEmail: demoContactEmail
            // });

            const { data, error } = await this.email.multiMailSender(
                (process.env.DEMO_MAIL_RECIPIENTS || '').split(','),
                emailSenderAddress,
                `Whr Demo Request by ${jobdata.firstName} ${jobdata.lastName}`,
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
    // @Process('contactUsMail')
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
                .replaceAll('{message}', jobdata.message)
                .replaceAll('{Source}', jobdata.source);;

            const { data, error } = await this.email.multiMailSender(
                (process.env.DEMO_MAIL_RECIPIENTS || '').split(','),
                emailSenderAddress,
                `Whr Demo Request by ${jobdata.firstName} ${jobdata.lastName}`,
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
