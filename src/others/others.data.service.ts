import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ContactUsDto, DemoContactDto, PresetDto } from './dto';
import { Prisma } from '@prisma/client';
import { CommunicationService } from 'src/communication/communication.service';
import { QueueActionOptions } from 'src/utils/types';
import { UserDataService } from 'src/user/user.data.service';

@Injectable()
export class OthersDataService {
    constructor(private readonly prismaService: PrismaService
        , private readonly communicationService: CommunicationService,
        private readonly userDataService: UserDataService
    ) { }
    async getPresetData(sqlBody: string) {
        const schemaName = process.env.NODE_ENV === 'development' ? 'temp_migration' : 'public';
        const [count, data] = await Promise.all([
            this.prismaService.$queryRaw<{ count: number }[]>(Prisma.raw(`
                 SELECT count(*)  count
                    FROM "${schemaName}"."Preset"
                      ${sqlBody.replace('ORDER', '-- ORDER')}`)),
            this.prismaService.$queryRaw<{
                id: string;
                name: string;
                totalEvent: number;
                data: string;
                newEventCount: number;
                keywords: string;
                description?: string;
                trackerType: any;
                deleted: boolean;
                filterValue: any;
            }[]>(Prisma.raw(`
                        SELECT *
                           FROM "${schemaName}"."Preset"
                             ${sqlBody}`))
        ]);
        return { data: { count: Number(count[0].count), trackers: data } };
    }
    async checkDailyLimitForContact() {
        return await this.prismaService.$queryRaw<{ count: number }[]>(Prisma.raw(`
            SELECT count(*) count FROM "ContactEnquiry" where "createdAt"::Date ='${(new Date()).toISOString().split('T')[0]}' ;
            `));
    }
    async checkUserLimitForContact(email: string) {
        return await this.prismaService.$queryRaw<{ count: number }[]>(Prisma.raw(`
            SELECT count(*)count FROM "ContactEnquiry" where "createdAt"::Date ='${(new Date()).toISOString().split('T')[0]}' and email='${email}'
            `));
    }
    async createContactEnquiry(data: any) {
        return await this.prismaService.contactEnquiry.create({
            data: {
                ...data
            }
        })
    }
    async upsertContactEnquiry(data: any) {
        const entry = await this.prismaService.contactEnquiry.findFirst({
            where: {
                email: data['email']
            }
        });
        if (!entry) {
            return await this.prismaService.contactEnquiry.create({
                data: {
                    ...data
                }
            });
        } else {
            return await this.prismaService.contactEnquiry.update({
                where: {
                    id: entry.id
                },
                data: {
                    createdAt: new Date()
                }
            });
        }

    }
    async createOrGetBullUser() {
        return await this.userDataService.createOrGetBullUser()
    }
    async sendDemoContactErrorEmail(data: any, sourceId: string) {
        await this.communicationService.createJobForBull(
            QueueActionOptions.SEND_CONTACT_ERROR_EMAIL, { ...data, sourceId: sourceId }, (await this.createOrGetBullUser()).id);
        return { data: { message: `email send for error.` } }
    }
    async sendDemoContactEmail(source: 'demoContact' | 'contactUs', data: DemoContactDto |
        ContactUsDto, sourceId: string) {
        await this.communicationService.createJobForBull(source === 'demoContact' ? QueueActionOptions.SEND_DEMO_CONTACT_EMAIL :
            QueueActionOptions.SEND_CONTACT_US_EMAIL, { ...data, sourceId: sourceId }, (await this.createOrGetBullUser()).id);
        return { data: { message: `email send for ${source}.` } }
    }
}
