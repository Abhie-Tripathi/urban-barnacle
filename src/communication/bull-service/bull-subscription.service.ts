import { PrismaService } from 'src/prisma/prisma.service';
import { Inject, Logger, Scope } from '@nestjs/common';
import { JobStatus, User } from '@prisma/client';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Processor, JOB_REF, WorkerHost } from '@nestjs/bullmq';
import { EmailService } from '../email/email.service';
import { emailSenderAddress, subscriptionCancelMail } from '../email/email.template';
@Processor(`{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}subscriptionProcessor}`)
export class SubscriptionEmailWorkerClass extends WorkerHost {
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
    private readonly logger = new Logger(SubscriptionEmailWorkerClass.name);
    async process(job: Job<any>): Promise<any> {
        await job.log(`Started processing job: ${job.name}`);
        await job.log(`Job data: ${JSON.stringify(job.data)}`);
        switch (job.name) {
            case 'cancelMail': {
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
    async handleEmailJob(job: Job) {
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
            const qnaHtmlTemplate: string = ` <div style="margin-top: 10px">
        <div><strong>Question{count}: {question}</strong></div>
        <div>Answer{count}: {answer}</div>
      </div>`;
            let qnaHtmlElement: string = '';
            let count: number = 1;
            for (const key in jobdata.qna || {}) {
                let temp_qnaHtmlTemplate = String(qnaHtmlTemplate);
                qnaHtmlElement = qnaHtmlElement + temp_qnaHtmlTemplate.replaceAll('{question}', key)
                    .replaceAll('{answer}', jobdata.qna[key]).replaceAll('{count}',count+'') + '\n';
                count++;
            }
             const FqnaHtmlTemplate: string = ` <div style="margin-top: 10px">
        <div><strong>{question}</strong></div>
        <div>{answer}</div>
      </div>`;
            let temp_qnaHtmlTemplate = String(FqnaHtmlTemplate);
            qnaHtmlElement = qnaHtmlElement + temp_qnaHtmlTemplate.replaceAll('{question}', 'Additional Comment ')
                .replaceAll('{answer}', jobdata.feedback).replace('{count}','') + '\n';
            const trackerAccessTemplate = subscriptionCancelMail
                .replace('{qna}', qnaHtmlElement)
                .replace('{userId}', jobdata.userId)
                .replace('{stripeId}', jobdata.stripeId)
                .replace('{cancelDate}', jobdata.cancelDate)
                .replace('{subscriptionId}', jobdata.subscriptionId);
            const { data, error } = await this.email.multiMailSender(
                (process.env.SUBSCRIPTION_CANCEL_MAIL_RECIPIENTS || '').split(','),
                emailSenderAddress,
                `WHR Subscription Cancellation By ${jobdata.userEmail}`,
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
            console.error((error));
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
