import { PrismaService } from 'src/prisma/prisma.service';
import { Inject, Logger, Scope } from '@nestjs/common';
import { JobStatus, User } from '@prisma/client';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { Processor, Process, JOB_REF } from '@nestjs/bull';
import { EmailService } from '../email/email.service';
import { emailSenderAddress, trackerAccessHtml } from '../email/email.template';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { TrackerService } from 'src/tracker/tracker.service';
import { View } from 'src/events/dto';
import { EventTabs } from 'src/tracker/dto';
@Processor({ name: 'exportProcessor', scope: Scope.REQUEST })
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
    //     userData
    // trackerId
    // searchByEntity
    // type =
    // jobRequestId
    //exportId<Type>
    //BACKEND
    // redirectUrl
    @Process('exportTrackerEventData')
    async handleEmailJob(job: Job<any>) {
        try {
            const jobData = job.data;
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
            const trackerTypeGTM: string[] = ['past', 'active', 'new',]
            const trackerTypeGEO: string[] = ['busniness', 'social', 'unattended']
            const trackerData = await this.prisma.tracker.findUnique({
                where: {
                    id: jobData['trackerId']
                }
            });
            if (!trackerData) {
                status = 'FAILED' as JobStatus;
                return {};
            }
            const bulkUpdateExport: { id: string; status: JobStatus; outputResponse?: object; fileUrl?: string }[] = []
            if (process.env.BACKEND === 'gtm') {
                if (eventTypeData === 'all') {
                    const [past, active, newEvents] = await Promise.all([
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (past).xlsx`, jobData['email'], 'past'),
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (past).xlsx`, jobData['email'], 'active'),
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (past).xlsx`, jobData['email'], 'new'),
                    ]);

                    if (past.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdPast'],
                            status: 'FAILED',
                        })
                    } else {
                        bulkUpdateExport.push({
                            id: jobData['exportIdPast'],
                            status: 'COMPLETED',
                            outputResponse: { ...past },
                            fileUrl: '' + past.fileName
                        })
                    }
                    if (active.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdActive'],
                            status: 'FAILED',
                        })
                    } else {
                        bulkUpdateExport.push({
                            id: jobData['exportIdActive'],
                            status: 'COMPLETED',
                            outputResponse: { ...active },
                            fileUrl: '' + active.fileName
                        })
                    }
                    if (newEvents.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdNew'],
                            status: 'FAILED',
                        })
                    } else {
                        bulkUpdateExport.push({
                            id: jobData['exportIdNew'],
                            status: 'COMPLETED',
                            outputResponse: { ...newEvents },
                            fileUrl: '' + newEvents.fileName
                        })
                    }
                }
                if (eventTypeData === 'past') {
                    const [past] = await Promise.all([
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (past).xlsx`, jobData['email'], 'past'),
                    ]);
                    if (past.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdPast'],
                            status: 'FAILED',
                        })
                    } else {
                        bulkUpdateExport.push({
                            id: jobData['exportIdPast'],
                            status: 'COMPLETED',
                            outputResponse: { ...past },
                            fileUrl: '' + past.fileName
                        })
                    }
                }
                if (eventTypeData === 'active') {
                    const [active] = await Promise.all([
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (past).xlsx`, jobData['email'], 'active'),
                    ]);
                    if (active.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdActive'],
                            status: 'FAILED',
                        })
                    } else {
                        bulkUpdateExport.push({
                            id: jobData['exportIdActive'],
                            status: 'COMPLETED',
                            outputResponse: { ...active },
                            fileUrl: '' + active.fileName
                        })
                    }

                }
                if (eventTypeData === 'new') {
                    const [newEvents] = await Promise.all([this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (past).xlsx`, jobData['email'], 'new'),
                    ]);
                    if (newEvents.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdNew'],
                            status: 'FAILED',
                        })
                    } else {
                        bulkUpdateExport.push({
                            id: jobData['exportIdNew'],
                            status: 'COMPLETED',
                            outputResponse: { ...newEvents },
                            fileUrl: '' + newEvents.fileName
                        })
                    }
                }
                await Promise.all(
                    bulkUpdateExport.map(({ id, status, fileUrl, outputResponse }) =>
                        this.prisma.export.update({
                            where: { id },
                            data: { status, fileUrl, outputData: outputResponse },
                        })
                    )
                );
            } else if (process.env.BACKEND === 'geo') {
                if (eventTypeData === 'all') {
                    const [busniness, social, unattended] = await Promise.all([
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (past).xlsx`, jobData['email'], 'busniness'),
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (past).xlsx`, jobData['email'], 'social'),
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (past).xlsx`, jobData['email'], 'unattended'),
                    ]);
                    if (busniness.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdBusniess'],
                            status: 'FAILED',
                        })
                    } else {
                        bulkUpdateExport.push({
                            id: jobData['exportIdBusniess'],
                            status: 'COMPLETED',
                            outputResponse: { ...busniness },
                            fileUrl: '' + busniness.fileName
                        })
                    }
                    if (social.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdSocial'],
                            status: 'FAILED',
                        })
                    } else {
                        bulkUpdateExport.push({
                            id: jobData['exportIdSocial'],
                            status: 'COMPLETED',
                            outputResponse: { ...social },
                            fileUrl: '' + social.fileName
                        })
                    }
                    if (unattended.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdUnattended'],
                            status: 'FAILED',
                        })
                    } else {
                        bulkUpdateExport.push({
                            id: jobData['exportIdUnattended'],
                            status: 'COMPLETED',
                            outputResponse: { ...unattended },
                            fileUrl: '' + unattended.fileName
                        })
                    }
                }
                if (eventTypeData === 'busniness') {
                    const [busniness] = await Promise.all([
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (past).xlsx`, jobData['email'], 'busniness'),
                    ]);
                    if (busniness.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdBusniess'],
                            status: 'FAILED',
                        })
                    } else {
                        bulkUpdateExport.push({
                            id: jobData['exportIdBusniess'],
                            status: 'COMPLETED',
                            outputResponse: { ...busniness },
                            fileUrl: '' + busniness.fileName
                        })
                    }
                }
                if (eventTypeData === 'social') {
                    const [social] = await Promise.all([
                        this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (past).xlsx`, jobData['email'], 'social'),
                    ]);
                    if (social.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdSocial'],
                            status: 'FAILED',
                        })
                    } else {
                        bulkUpdateExport.push({
                            id: jobData['exportIdSocial'],
                            status: 'COMPLETED',
                            outputResponse: { ...social },
                            fileUrl: '' + social.fileName
                        })
                    }
                }
                if (eventTypeData === 'unattended') {
                    const [unattended] = await Promise.all([this.createTraclerExportForEventData(jobData, `${trackerData.name} ${trackerData.id} (past).xlsx`, jobData['email'], 'unattended'),
                    ]);
                    if (unattended.error) {
                        bulkUpdateExport.push({
                            id: jobData['exportIdUnattended'],
                            status: 'FAILED',
                        })
                    } else {
                        bulkUpdateExport.push({
                            id: jobData['exportIdUnattended'],
                            status: 'COMPLETED',
                            outputResponse: { ...unattended },
                            fileUrl: '' + unattended.fileName
                        })
                    }
                }
                await Promise.all(
                    bulkUpdateExport.map(({ id, status, fileUrl, outputResponse }) =>
                        this.prisma.export.update({
                            where: { id },
                            data: { status, fileUrl, outputData: outputResponse },
                        })
                    )
                );
            }
            return {}
        } catch (error) {

        }
    }
    async createTraclerExportForEventData(jobData: any, fileName: string, email: string, type: string) {
        try {
            const dir = './public/export';
            const excelFilePath = `${dir}/${fileName.replace(/\.csv$/, '.xlsx')}`;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Events');

            worksheet.columns = [
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
                { header: 'Frequency', key: 'frequency', width: 15 },
                { header: 'Total Editions', key: 'editions', width: 20 },
                { header: 'Event Format', key: 'format', width: 20 },
                { header: 'Is Series', key: 'series', width: 10 },
                { header: 'Event Type', key: 'eventType', width: 30 },
                { header: 'Categories', key: 'categories', width: 30 },
                { header: 'Tags', key: 'keywords', width: 30 },
                { header: 'Organizer', key: 'organizer', width: 30 },
                { header: 'Global Rank', key: 'rank', width: 15 },
                { header: 'Trust Score', key: 'trust', width: 20 },
                { header: 'Interests Growth (%)', key: 'growth', width: 20 },
                { header: 'Repeat Sentiment (%)', key: 'repeat', width: 20 },
                { header: 'Estimated Audience', key: 'size', width: 15 },
                { header: 'Estimated Exhibitors', key: 'exhibitor', width: 20 },
                { header: 'International Audience (%)', key: 'international', width: 20 },
                { header: 'Matched Keywords', key: 'matched', width: 30 },
                { header: 'Match Score (%)', key: 'matchScore', width: 20 },
                { header: 'Association', key: 'association', width: 30 },
                { header: 'Association Match (%)', key: 'associationPercentage', width: 25 },
                { header: 'Competitor Association', key: 'competitorAssociation', width: 30 },
            ];

            let offset = 0;
            const limit = 30;
            let flagforCount: boolean = false;
            let totalCount: number = 1000;
            if (((JSON.stringify(process.env.TRACKER_EXPORT_USERS_FULL_ACCESS || [])) as unknown as string[]).includes(email)) {
                totalCount = Infinity;
                flagforCount = true;
            } else if (((JSON.stringify(process.env.TRACKER_EXPORT_USERS_LIMITED_ACCESS || [])) as unknown as string[]).includes(email)) {
                totalCount = 1000;
            } else {
                totalCount = 0;
            }


            while (offset < totalCount) {
                console.log(`Processing ${offset} to ${offset + limit} records`);
                const showValues = 'basic,advance,insights,audience';
                const response = await this.trackerService.getTrackerEvents(jobData['userData'], jobData['trackerId'],
                    {
                        limit, offset, view: View.tracker, type: type as keyof typeof EventTabs
                        , sortBy: ['score', 'title']
                    }, showValues) as {
                        count?: number;
                        events: {
                            basic: Record<string, any>;
                            advance: Record<string, any>;
                            insights: Record<string, any>;
                            trackerMatchInfo?: Record<string, any>;
                        }[];
                    };

                const events = response?.events || [];
                totalCount = flagforCount ? (response?.count || 0) : totalCount;
                if (events.length === 0) break;

                for (const data of events) {
                    const lat = data.basic.eventLocation?.venue?.latitude || data.basic.eventLocation?.city?.latitude;
                    const lon = data.basic.eventLocation?.venue?.longitude || data.basic.eventLocation?.city?.longitude;
                    worksheet.addRow({
                        id: data.basic.id,
                        name: data.basic.name,
                        page: 'https://10times.com/' + data.basic['10timesEventPageUrl'],
                        website: data.basic.website,
                        venueName: data.basic.eventLocation?.venue?.name || '',
                        venueAddress: data.basic.eventLocation?.venue?.address || '',
                        geo: `Latitude:${lat}, Longitude:${lon}`,
                        city: data.basic.eventLocation?.city?.name || '',
                        country: data.basic.eventLocation?.country?.name || '',
                        region: data.basic.eventLocation?.country?.regions?.join(', ') || '',
                        startDate: data.basic.startDateTime,
                        endDate: data.basic.endDateTime,
                        frequency: data.advance?.frequency || '',
                        editions: data?.advance?.editions || '',
                        format: data.basic.format,
                        series: (data?.advance?.isSeries ? `TRUE` : 'FALSE') + '',
                        eventType: data.basic.eventTypes?.map(val => val.name).join(','),
                        categories: data.basic.categories?.map((item) => item.name).join(','),
                        keywords: data.basic.tags?.map((item) => item.name.trim()).join(','),
                        organizer: data.basic.organizer?.name || '',
                        rank: data.insights?.rankings?.rank || '',
                        trust: data.insights?.trustScore + '',
                        growth: data.insights?.yoyGrowth || '',
                        repeat: data.insights?.reputationChangePercentage || '',
                        size: data.insights?.estimatedAttendance || '',
                        exhibitor: data.insights?.estimatedExhibitors || '',
                        international: data['internationalScore'] || '',
                        matched: data.basic?.matchedKeywords?.join(',') || '',
                        matchScore: data.basic?.matchedKeywordsPercentage || '',
                        ...(data.trackerMatchInfo ? {
                            association: (jobData?.searchByEntity === 'company' ? data.trackerMatchInfo['competitorDomainOrName']
                                : jobData?.searchByEntity === 'user' ? data.trackerMatchInfo['peopleFinderPersonAssociation'] : data.trackerMatchInfo['speakerPersonAssociation']).join(','),
                            associationPercentage: (jobData?.searchByEntity === 'company' ? data.trackerMatchInfo['competitorPercentage']
                                : jobData?.searchByEntity === 'user' ? data.trackerMatchInfo['peopleFinderPersonAssociationPercentage'] : data.trackerMatchInfo['speakerPersonAssociationPercentage']),
                            ...(jobData?.searchByEntity === 'company' ? { competitorAssociation: data.trackerMatchInfo['competitorAssociation'] } : {})
                        } : {})
                    });
                }

                offset += limit;
            }

            await workbook.xlsx.writeFile(excelFilePath);
            const stats = fs.statSync(excelFilePath);
            const fileSizeInBytes = stats.size;
            const fileSizeInKB = (fileSizeInBytes / 1024).toFixed(2);
            const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
            console.log(`Excel file written to ${excelFilePath}`);
            return {
                status: "done",
                fileName,
                fileSizeInKB,
                fileSizeInMB
            }
        } catch (error) {
            return {
                status: "error",
                error
            }
        }
    }
}
