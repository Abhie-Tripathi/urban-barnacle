import { PrismaService } from 'src/prisma/prisma.service';
import { HttpException, HttpStatus, Inject, Logger, Scope } from '@nestjs/common';
import { AttachmentSourceModule, JobStatus, User } from '@prisma/client';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { Processor, Process, JOB_REF } from '@nestjs/bull';
import { EmailService } from '../email/email.service';
import { emailSenderAddress, exportCompleteMailTemplate, trackerAccessHtml, exportFailMailTemplate } from '../email/email.template';
import * as fs from 'fs';
import * as ExcelJS from 'exceljs';
import { TrackerService } from 'src/tracker/tracker.service';
import { Show, View } from 'src/events/dto';
import { EventTabs, TrackerEventStatus } from 'src/tracker/dto';
import { TCachedUser } from 'src/utils/types';

interface JobDataForExport {
    userData: TCachedUser,
    trackerId: string,
    searchByEntity?: string,
    jobRequestId: string,
    redirectUrl: string,
    exportIdNew?: string,
    exportIdActive?: string,
    exportIdPast?: string,
    exportIdBusiness?: string,
    exportIdSocial?: string,
    exportIdUnattended?: string,
    type: 'all' | 'past' | 'active' | 'new' | 'business' | 'social' | 'unattended',
    source: 'TRACKER'
}
@Processor({ name: `{${(process.env.BACKEND || 'gtm') + (process.env.TEMP_REDIS_KEY || '')}exportProcessor}`, scope: Scope.REQUEST })
export class ExportWorkerClass {
    constructor(
        private email: EmailService,
        private prisma: PrismaService,
        @Inject(JOB_REF) jobRef: Job,

        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
        private configService: ConfigService,
        private readonly trackerService: TrackerService
    ) {
        console.log(JSON.stringify(jobRef));
    }
    private readonly logger = new Logger(ExportWorkerClass.name);

    @Process('exportTrackerEventData')
    async handleEmailJob(job: Job<JobDataForExport>) {
        const jobData = job.data;
        const bulkUpdateExport: { id?: string; status: JobStatus; outputResponse?: object; fileUrl?: string, fileSize?: number, attachment?: any }[] = [];
        let attachments: any[] = [];
        try {
            jobData['email'] = jobData.userData.email;
            const eventTypeData: string = jobData['type']
            console.log(`Processing job: ${JSON.stringify(jobData)}`);
            const dir = './public/export';
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            let status = 'PROCESSING' as JobStatus;
            const upadte = await this.prisma.requestedJob.update({
                where: {
                    id: jobData['jobRequestId'],
                },
                data: {
                    status: status,
                },
            });
            const trackerData = await this.prisma.tracker.findUnique({
                where: {
                    id: jobData['trackerId'],
                    deleted: false,
                }
            });
            if (!trackerData) {
                status = 'FAILED' as JobStatus;
                throw new HttpException("Failed to find tracker", HttpStatus.NOT_FOUND)
            }
            const searchByEntity = ['T_COMPETITOR', 'T_CUSTOMER_ICP'].includes(
                trackerData.type,
            )
                ? 'company'
                : trackerData.type === 'T_PEOPLE_FINDER'
                    ? 'user'
                    : trackerData.type === 'T_SPEAKING_OPPORTUNITY'
                        ? 'speaker'
                        : trackerData.type === 'T_RECRUITMENT'
                            ? 'recruitment'
                            : trackerData.type === 'T_PRODUCT_KEYWORDS'
                                ? 'keywords'
                                : undefined;
            jobData['searchByEntity'] = searchByEntity;
            let flagForExportStatus: number = 0;
            if (process.env.BACKEND === 'gtm') {
                if (eventTypeData === 'all') {
                    const [past, active, newEvents] = await Promise.all([
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (past).xlsx`, jobData['email'], 'past', jobData.userData['id'], jobData.trackerId, jobData.source),
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (active).xlsx`, jobData['email'], 'active', jobData.userData['id'], jobData.trackerId, jobData.source),
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (new).xlsx`, jobData['email'], 'new', jobData.userData['id'], jobData.trackerId, jobData.source),
                    ]);

                    if (past.status === "error") {
                        bulkUpdateExport.push({
                            id: jobData['exportIdPast'],
                            status: 'FAILED',
                            outputResponse: { ...past },
                        })
                    } else {
                        flagForExportStatus++;
                        bulkUpdateExport.push({
                            id: jobData['exportIdPast'],
                            status: 'COMPLETED',
                            outputResponse: { ...past },
                            fileUrl: past.fileUrl,
                            fileSize: Number(past.fileSize),
                            attachment: past.attachment,
                        })
                    }
                    if (active.status === "error") {
                        bulkUpdateExport.push({
                            id: jobData['exportIdActive'],
                            status: 'FAILED',
                            outputResponse: { ...active },
                        })
                    } else {
                        flagForExportStatus++;
                        bulkUpdateExport.push({
                            id: jobData['exportIdActive'],
                            status: 'COMPLETED',
                            outputResponse: { ...active },
                            fileUrl: active.fileUrl,
                            fileSize: Number(active.fileSize),
                            attachment: active.attachment,
                        })
                    }
                    if (newEvents.status === "error") {
                        bulkUpdateExport.push({
                            id: jobData['exportIdNew'],
                            status: 'FAILED',
                            outputResponse: { ...newEvents },
                        })
                    } else {
                        flagForExportStatus++;
                        bulkUpdateExport.push({
                            id: jobData['exportIdNew'],
                            status: 'COMPLETED',
                            outputResponse: { ...newEvents },
                            fileUrl: newEvents.fileUrl,
                            fileSize: Number(newEvents.fileSize),
                            attachment: newEvents.attachment,
                        })
                    }
                }
                if (eventTypeData === 'past') {
                    const [past] = await Promise.all([
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (past).xlsx`, jobData['email'], 'past', jobData.userData['id'], jobData.trackerId, jobData.source),
                    ]);
                    // console.log("\n\n\n\n\n\n", { past });

                    if (past.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdPast'],
                            status: 'FAILED',
                            outputResponse: { ...past },
                        })
                    } else {
                        flagForExportStatus++;
                        bulkUpdateExport.push({
                            id: jobData['exportIdPast'],
                            status: 'COMPLETED',
                            outputResponse: { ...past },
                            fileUrl: past.fileUrl,
                            fileSize: Number(past.fileSize),
                            attachment: past.attachment,
                        })
                    }
                }
                if (eventTypeData === 'active') {
                    const [active] = await Promise.all([
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (active).xlsx`, jobData['email'], 'active', jobData.userData['id'], jobData.trackerId, jobData.source),
                    ]);
                    if (active.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdActive'],
                            status: 'FAILED',
                            outputResponse: { ...active },
                        })
                    } else {
                        flagForExportStatus++;
                        bulkUpdateExport.push({
                            id: jobData['exportIdActive'],
                            status: 'COMPLETED',
                            outputResponse: { ...active },
                            fileUrl: active.fileUrl,
                            fileSize: Number(active.fileSize),
                            attachment: active.attachment,
                        })
                    }

                }
                if (eventTypeData === 'new') {
                    const [newEvents] = await Promise.all([this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (new).xlsx`, jobData['email'], 'new', jobData.userData['id'], jobData.trackerId, jobData.source),
                    ]);
                    if (newEvents.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdNew'],
                            status: 'FAILED',
                            outputResponse: { ...newEvents },
                        })
                    } else {
                        flagForExportStatus++;
                        bulkUpdateExport.push({
                            id: jobData['exportIdNew'],
                            status: 'COMPLETED',
                            outputResponse: { ...newEvents },
                            fileUrl: newEvents.fileUrl,
                            fileSize: Number(newEvents.fileSize),
                            attachment: newEvents.attachment,
                        })
                    }
                }
                // console.log({ bulkUpdateExport });
                await Promise.all(
                    bulkUpdateExport.map(({ id, status, fileUrl, outputResponse, attachment, fileSize }) => {
                        attachments.push(attachment);
                        return this.prisma.export.update({
                            where: { id },
                            data: { status, fileSize, fileUrl, outputData: outputResponse },
                        })
                    }
                    )
                );
            } else if (process.env.BACKEND === 'geo') {
                // console.log({ jobData });

                if (eventTypeData === 'all') {
                    const [business, social, unattended] = await Promise.all([
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (business).xlsx`, jobData['email'], 'business', jobData.userData['id'], jobData.trackerId, jobData.source),
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (social).xlsx`, jobData['email'], 'social', jobData.userData['id'], jobData.trackerId, jobData.source),
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (unattended).xlsx`, jobData['email'], 'unattended', jobData.userData['id'], jobData.trackerId, jobData.source),
                    ]);
                    if (business.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdBusiness'],
                            status: 'FAILED',
                            outputResponse: { ...business },
                        })
                    } else {
                        flagForExportStatus++;
                        bulkUpdateExport.push({
                            id: jobData['exportIdBusiness'],
                            status: 'COMPLETED',
                            outputResponse: { ...business },
                            fileUrl: business.fileUrl,
                            fileSize: Number(business.fileSize),
                            attachment: business.attachment
                        })
                    }
                    if (social.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdSocial'],
                            status: 'FAILED',
                            outputResponse: { ...social },
                        })
                    } else {
                        flagForExportStatus++;
                        bulkUpdateExport.push({
                            id: jobData['exportIdSocial'],
                            status: 'COMPLETED',
                            outputResponse: { ...social },
                            fileUrl: social.fileUrl,
                            fileSize: Number(social.fileSize),
                            attachment: social.attachment
                        })
                    }
                    if (unattended.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdUnattended'],
                            status: 'FAILED',
                            outputResponse: { ...social },
                        })
                    } else {
                        flagForExportStatus++;
                        bulkUpdateExport.push({
                            id: jobData['exportIdUnattended'],
                            status: 'COMPLETED',
                            outputResponse: { ...unattended },
                            fileUrl: unattended.fileUrl,
                            fileSize: Number(unattended.fileSize),
                            attachment: unattended.attachment
                        })
                    }
                }
                if (eventTypeData === 'business') {
                    const [business] = await Promise.all([
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (business).xlsx`, jobData['email'], 'business', jobData.userData['id'], jobData.trackerId, jobData.source),
                    ]);
                    // console.log(business);

                    if (business.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdBusiness'],
                            status: 'FAILED',
                            outputResponse: { ...business },
                        })
                    } else {
                        flagForExportStatus++;
                        bulkUpdateExport.push({
                            id: jobData['exportIdBusiness'],
                            status: 'COMPLETED',
                            outputResponse: { ...business },
                            fileUrl: business.fileUrl,
                            fileSize: Number(business.fileSize),
                            attachment: business.attachment
                        })
                    }
                }
                if (eventTypeData === 'social') {
                    const [social] = await Promise.all([
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (social).xlsx`, jobData['email'], 'social', jobData.userData['id'], jobData.trackerId, jobData.source),
                    ]);
                    if (social.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdSocial'],
                            status: 'FAILED',
                            outputResponse: { ...social },
                        })
                    } else {
                        flagForExportStatus++;
                        bulkUpdateExport.push({
                            id: jobData['exportIdSocial'],
                            status: 'COMPLETED',
                            outputResponse: { ...social },
                            fileUrl: social.fileUrl,
                            fileSize: Number(social.fileSize),
                            attachment: social.attachment
                        })
                    }
                }
                if (eventTypeData === 'unattended') {
                    const [unattended] = await Promise.all([this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (unattended).xlsx`, jobData['email'], 'unattended', jobData.userData['id'], jobData.trackerId, jobData.source),
                    ]);
                    if (unattended.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdUnattended'],
                            status: 'FAILED',
                            outputResponse: { ...unattended },
                        })
                    } else {
                        flagForExportStatus++;
                        bulkUpdateExport.push({
                            id: jobData['exportIdUnattended'],
                            status: 'COMPLETED',
                            outputResponse: { ...unattended },
                            fileUrl: unattended.fileUrl,
                            fileSize: Number(unattended.fileSize),
                            attachment: unattended.attachment
                        })
                    }
                }
                await Promise.all(
                    bulkUpdateExport.map(({ id, status, fileUrl, outputResponse, attachment, fileSize }) => {
                        attachments.push(attachment);
                        return this.prisma.export.update({
                            where: { id },
                            data: { status, fileUrl, fileSize, outputData: outputResponse },
                        })
                    }
                    )
                );
            }
            if (flagForExportStatus >= 1) {
                status = 'COMPLETED' as JobStatus;
            } else {
                status = 'FAILED' as JobStatus;
            }
            // if (jobData['email'] === 'vipul.gupta@10times.com') {
            //     jobData.userData.email = 'piyush@10times.com';
            // }
            if (status === 'COMPLETED') {
                const exportCompletMail: string = exportCompleteMailTemplate
                    .replaceAll('{firstName}', jobData.userData.firstname || '')
                    .replaceAll('{lastName}', jobData.userData.lastname || '')
                    .replaceAll('{redirectLink}', jobData.redirectUrl);
                const { data, error } = await this.email.mailSender(
                    jobData.userData.email,
                    emailSenderAddress,
                    'Export Event Data Request Completed',
                    exportCompletMail,
                    attachments.filter(val => val),
                );
                let status = 'COMPLETED' as JobStatus;
                if (error) {
                    status = 'FAILED' as JobStatus;
                }
            } else {
                const exportFailMail: string = exportFailMailTemplate
                    .replaceAll('{firstName}', jobData.userData.firstname || '')
                    .replaceAll('{lastName}', jobData.userData.lastname || '');
                console.log({ attachments: Array.isArray(attachments) ? (attachments as any[]).length : 0 });

                const { data, error } = await this.email.mailSender(
                    jobData.userData.email,
                    emailSenderAddress,
                    'Export Event Data Request Failed',
                    exportFailMail,
                    attachments.filter(val => val),
                );
                let status = 'COMPLETED' as JobStatus;
                if (error) {
                    status = 'FAILED' as JobStatus;
                }
            }
            // console.log((jobData));
            await this.prisma.requestedJob.update({
                where: {
                    id: jobData['jobRequestId'],
                },
                data: {
                    status: status,
                },
            });
            return {}
        } catch (error) {
            console.log(JSON.stringify(error));
            console.log((error));
            await Promise.all(
                bulkUpdateExport.map(({ id, status, fileUrl, outputResponse, fileSize }) =>
                    this.prisma.export.update({
                        where: { id },
                        data: { status: 'FAILED' },
                    })
                )
            );
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
    async createTraclerExportForEventData(jobData: any, fileName: string, email: string, type: string, userId: string, sourceId: string, sourceModule: AttachmentSourceModule) {
        try {
            const dir = './public/export';
            fileName = fileName.replace(/\.csv$/, '.xlsx').replaceAll(' ', '-').replace(")", `)(${(new Date()).toISOString()})`).replace(")", `)${Math.random()}`).toLowerCase();
            const excelFilePath = `${dir}/${fileName.replace(/\.csv$/, '.xlsx').replaceAll(' ', '-')}`;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Events');
            const mediaHost: string = process.env.MEDIA_STORAGE_DOMAIN || '';
            let columns = [
                { header: 'Event Id', key: 'id', width: 20 },
                { header: 'Event Name', key: 'name', width: 30 },
                { header: 'TenTimes Page', key: 'page', width: 30 },
                { header: 'Event Website', key: 'website', width: 30 },
                { header: 'Venue Name', key: 'venueName', width: 30 },
                { header: 'Venue Address', key: 'venueAddress', width: 30 },
                { header: 'Geo-Coordinates', key: 'geo', width: 30 },
                { header: 'City', key: 'city', width: 20 },
                { header: 'Country', key: 'country', width: 20 },
                { header: 'Region', key: 'region', width: 30 },
                { header: 'Start Date', key: 'startDate', width: 20 },
                { header: 'End Date', key: 'endDate', width: 20 },
                { header: 'Future Start Date', key: 'futureExpectedStartDate', width: 20 },
                { header: 'Future End Date', key: 'futureExpectedEndDate', width: 20 },
                { header: 'Frequency', key: 'frequency', width: 15 },
                { header: 'Total Editions', key: 'editions', width: 20 },
                { header: 'Event Format', key: 'format', width: 20 },
                { header: 'Is Series', key: 'series', width: 10 },
                { header: 'Event Type', key: 'eventType', width: 30 },
                { header: 'Categories', key: 'categories', width: 30 },
                { header: 'Tags', key: 'keywords', width: 30 },
                { header: 'Organizer', key: 'organizer', width: 30 },
                { header: 'Global Rank', key: 'rank', width: 15 },
                { header: 'Rating', key: 'rating', width: 20 },
                { header: 'Impact Score', key: 'impactScore', width: 20 },
                { header: 'International Score', key: 'internationalScore', width: 20 },
                { header: 'Inbound Score', key: 'inboundScore', width: 20 },
                { header: 'Audience Zone', key: 'audienceZone', width: 30 },
                { header: 'Trust Score', key: 'trust', width: 20 },
                { header: 'Interests Growth (%)', key: 'growth', width: 20 },
                { header: 'Repeat Sentiment (%)', key: 'repeat', width: 20 },
                { header: 'Estimated Audience', key: 'size', width: 15 },
                { header: 'Estimated Exhibitors', key: 'exhibitor', width: 20 },
            ];
            if (jobData?.searchByEntity) {
                columns.push(...[
                    { header: 'Matched', key: 'matched', width: 30 },
                    { header: 'Relevance Score', key: 'matchScore', width: 20 },])
            }
            worksheet.columns = columns;
            let offset = 0;
            const limit = 30;
            let flagforCount: boolean = false;
            let totalCount: number = 1000;
            const fullAccessUsers = JSON.parse(process.env.TRACKER_EXPORT_USERS_FULL_ACCESS || '[]') as string[];
            const limitedAccessUsers = JSON.parse(process.env.TRACKER_EXPORT_USERS_LIMITED_ACCESS || '[]') as string[];

            if (fullAccessUsers.includes(email)) {
                totalCount = Infinity;
                flagforCount = true;
            } else if (limitedAccessUsers.includes(email)) {
                totalCount = 1000;
            } else {
                totalCount = 0;
            }
            // console.log({ totalCount }, {
            //     fullAccessUsers,
            //     limitedAccessUsers
            // }, email);
            // const { trackerEventsIntelScore } = await this.trackerService.getTrackerIntelScore(jobData['userData'], jobData['trackerId'], { eventIds: '', limit: 0, offset: 0, type: type as keyof typeof EventTabs });
            let linesWrittern: number = 0;
            while (offset < totalCount) {
                console.log(`Processing ${offset} to ${offset + limit} records`);
                const showValues = 'basic,advance,insights,audience';
                const response = await this.trackerService.getTrackerEvents(jobData['userData'], jobData['trackerId'],
                    {
                        limit, offset, view: View.tracker, ...(process.env.BACKEND === 'gtm' ? { trackerEventStatus: type as keyof typeof TrackerEventStatus, type: type as any } : { eventTypeGroup: type })
                        , sortBy: ['-score', 'title'], show: [
                            'branded',
                            'series',
                            'forecasted',
                            'rating',
                            'estimatedExhibitors',
                            'trustScore',
                            'audienceSpread',
                            'audienceZone',
                            'economicImpact',
                            'rankings',
                            'scores',
                            'maturity',
                            'frequency',
                            'alerts',
                        ] as unknown as Show[]
                    }, showValues) as {
                        count?: number;
                        events: {
                            basic: Record<string, any>;
                            advance: Record<string, any>;
                            insights: Record<string, any>;
                            trackerMatchInfo?: Record<string, any>;
                            audience: Record<string, any>;
                        }[];
                    };

                // console.log(response);
                const events = response?.events || [];
                totalCount = flagforCount ? (response?.count || 0) : totalCount;
                if (events.length === 0 || linesWrittern === totalCount) break;
                // const { trackerEventsIntelScore } = await this.trackerService.getTrackerIntelScore(jobData['userData'], jobData['trackerId'], { eventIds: events.map(val => val.basic.id).join(','), limit: events.length, offset: 0, type: type as keyof typeof EventTabs, trackerEventStatus: type as any });
                for (const data of events) {
                    if (linesWrittern === totalCount) break;
                    // const { trackerEventsIntelScore } = await this.trackerService.getTrackerIntelScore(jobData['userData'], jobData['trackerId'], { eventIds: events.map(val => val.basic.id).join(','), limit: events.length, offset: 0, type: type as keyof typeof EventTabs, trackerEventStatus: type as any });
                    let eventTYpes: string = (data.basic.eventTypes?.map(val => val.name).join(',')) || '';
                    if (eventTYpes.toLowerCase().includes('workshop') && eventTYpes.split(',').length > 1) {
                        eventTYpes = eventTYpes.replaceAll(',Workshop', '').replaceAll('Workshop,', '');
                    }
                    let matched: string = data.basic?.matchedKeywords?.join(',') || '';
                    let matchScore: string = data.basic?.matchedKeywordsPercentage || '';
                    // const score = (trackerEventsIntelScore.find(val => val['event'] === data.basic.id));
                    // if (score) {
                    // matchScore = score['alltrackers_score'];
                    // } else {
                    matchScore = '';
                    // }
                    if (jobData?.searchByEntity === 'company' && data.trackerMatchInfo) {
                        matched = (data.trackerMatchInfo['competitorDomainOrName'] as string[]).map(val => {
                            const temp: string[] = val.split('_');
                            return `${temp[1]} (${temp[0]})`;

                        }).join("\n");

                    } else if (jobData?.searchByEntity === 'user' && data.trackerMatchInfo) {
                        matched = (data.trackerMatchInfo['peopleFinderPersonAssociation'] as string[]).map(val => {
                            const temp: string[] = val.split('_');
                            return `${temp[1]} ${temp[2]} (${temp[0]})`;

                        }).join("\n");
                    } else if (jobData?.searchByEntity === 'speaker' && data.trackerMatchInfo) {
                        matched = (data.trackerMatchInfo['speakerPersonAssociation'] as string[]).map(val => {
                            const temp: string[] = val.split('_');
                            return `${temp[0]} ${temp[1]} (speaker)`;

                        }).join("\n");
                    }
                    // (data.trackerMatchInfo ? {
                    //     association: (jobData?.searchByEntity === 'company' ? data.trackerMatchInfo['competitorDomainOrName']
                    //         : jobData?.searchByEntity === 'user' ? data.trackerMatchInfo['peopleFinderPersonAssociation'] : data.trackerMatchInfo['speakerPersonAssociation']).join(','),
                    //     associationPercentage: (jobData?.searchByEntity === 'company' ? data.trackerMatchInfo['competitorPercentage']
                    //         : jobData?.searchByEntity === 'user' ? data.trackerMatchInfo['peopleFinderPersonAssociationPercentage'] : data.trackerMatchInfo['speakerPersonAssociationPercentage']),
                    //     ...(jobData?.searchByEntity === 'company' ? { competitorAssociation: data.trackerMatchInfo['competitorAssociation'] } : {})
                    // } : {})
                    const locationPayload = data.basic.eventLocation?.locationType ? this.devLocationTranformation(data) : this.prodLocationTranformation(data);
                    const eventFormat = {
                        in_person: 'In Person',
                        online: 'Online',
                        hybrid: "Hybrid"
                    }
                    worksheet.addRow({
                        id: data.basic.id,
                        name: data.basic.name,
                        page: 'https://10times.com/' + data.basic['10timesEventPageUrl'],
                        website: data.basic.website,
                        startDate: data.basic.startDateTime,
                        futureExpectedStartDate: data.basic.futureExpectedStartDate || '',
                        futureExpectedEndDate: data.basic.futureExpectedEndDate || '',
                        endDate: data.basic.endDateTime,
                        frequency: data.advance?.frequency || '',
                        editions: data?.advance?.editions || '',
                        format: eventFormat[(data.basic.format as string)],
                        series: (data?.advance?.isSeries ? `TRUE` : 'FALSE') + '',
                        eventType: eventTYpes,
                        categories: data.basic.categories?.map((item) => item.name).join(','),
                        keywords: data.basic.tags?.map((item) => item.name.trim()).join(','),
                        organizer: data.basic.organizer?.name || '',
                        rating: data.basic.rating || "",
                        rank: data.insights?.rankings?.rank || '',
                        trust: data.insights?.trustScore + '',
                        growth: data.insights?.yoyGrowth || '',
                        repeat: data.insights?.reputationChangePercentage || '',
                        impactScore: data.insights?.scores?.impactScore || '',
                        internationalScore: data.insights?.scores?.internationalScore || '',
                        inboundScore: data.insights?.scores?.inboundScore || '',
                        audienceZone: data.audience?.audienceZone || '',
                        size: data.insights?.estimatedAttendance || '',
                        exhibitor: data.insights?.estimatedExhibitors || '',
                        international: data['internationalScore'] || '',
                        matched: matched,
                        ...locationPayload,
                        matchScore: matchScore,
                    });

                    linesWrittern++;
                }

                offset += limit;
            }

            await workbook.xlsx.writeFile(excelFilePath);
            const stats = fs.statSync(excelFilePath);
            const fileSizeInBytes = stats.size;
            const fileSizeInKB = (fileSizeInBytes / 1024).toFixed(2);
            const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
            console.log(`Excel file written to ${excelFilePath}`);
            const upload = await this.prisma.attachment.upsert({
                where: {
                    fileUrl: mediaHost + '/public/' + fileName
                },
                create: {
                    fileName: fileName,
                    fileType: 'EXCEL',
                    fileSize: Number(fileSizeInKB || 0),
                    fileUrl: (mediaHost + '/public/' + fileName).replaceAll(' ', '-'),
                    createdByUser: { connect: { id: userId } },
                    sourceModule: sourceModule,
                    sourceId: sourceId,
                },
                update: {

                },
                select: {
                    id: true,
                    fileName: true,
                    fileUrl: true,
                    fileType: true,
                    fileSize: true,
                },
            });
            const fileData = fs.readFileSync(excelFilePath);
            const base64File = fileData.toString('base64');
            const attachment =
            {
                content: base64File,
                filename: fileName,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                disposition: 'attachment',
            };
            return {
                attachment,
                status: "done",
                fileSizeInKB,
                fileSizeInMB,
                ...upload
            }
        } catch (error) {
            console.error(error);
            console.log(error);
            console.log(JSON.stringify(error));


            return {
                status: "error",
                ...error
            }
        }
    }

    devLocationTranformation(data: any) {
        // {
        //     "id": "8f8ccdac-9912-52b7-8db1-3d31c5218010",
        //     "name": "INDIA EXPO CENTRE & MART",
        //     "locationType": "VENUE",
        //     "latitude": "28.472939",
        //     "longitude": "77.503889",
        //     "countryIso": "IN",
        //     "address": "FGF3+5HC Knowledge Park I Greater Noida Uttar Pradesh 201310 India",
        //     "cityId": "86650b08-2f0a-5184-bc81-eb1737191221",
        //     "cityName": "Greater Noida",
        //     "stateId": "b14417f4-f187-5273-ac70-5a0f17fac7c9",
        //     "stateName": "Uttar Pradesh",
        //     "countryId": "226e11ef-32fc-5484-9843-7087fdfb413d",
        //     "countryName": "India",
        //     "displayName": "INDIA EXPO CENTRE & MART,Greater Noida,Uttar Pradesh,India",
        //     "cityLatitude": "28.474000",
        //     "cityLongitude": "77.504000"
        //   }
        const lat = data.basic.eventLocation?.latitude;
        const lon = data.basic.eventLocation?.longitude;

        return {
            venueName: data.basic.eventLocation.locationType === 'VENUE' ? data.basic.eventLocation?.name || '' : '',
            venueAddress: data.basic.eventLocation.locationType === 'VENUE' ? data.basic.eventLocation?.address || '' : '',
            geo: `Latitude:${lat}, Longitude:${lon}`,
            city: data.basic.eventLocation.locationType === 'CITY' ? data.basic.eventLocation?.name || '' : data.basic.eventLocation?.cityName || '',
            country: data.basic.eventLocation?.countryName || '',
            region: data.basic.eventLocation?.country?.regions?.join(', ') || '',

        }
    }
    prodLocationTranformation(data: any) {
        const lat = data.basic.eventLocation?.venue?.latitude;
        const lon = data.basic.eventLocation?.venue?.longitude;
        return {
            venueName: data.basic.eventLocation?.venue?.name || '',
            venueAddress: data.basic.eventLocation?.venue?.address || '',
            geo: `Latitude:${lat}, Longitude:${lon}`,
            city: data.basic.eventLocation?.city?.name || '',
            country: data.basic.eventLocation?.country?.name || '',
            region: data.basic.eventLocation?.country?.regions?.join(', ') || '',

        }
    }
}
