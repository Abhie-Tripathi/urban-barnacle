import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DemoDto, PresetDto } from './dto';
import { Prisma } from '@prisma/client';
import { CommunicationService } from 'src/communication/communication.service';
import { QueueActionOptions } from 'src/utils/types';

@Injectable()
export class OthersDataService {
    constructor(private readonly prismaService: PrismaService
        , private readonly communicationService: CommunicationService
    ) { }
    async getPresetData(sqlBody: string) {
        const [count, data] = await Promise.all([
            this.prismaService.$queryRaw<{ count: number }[]>(Prisma.raw(`
                 SELECT count(*)  count
                    FROM "Preset"
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
                           FROM "Preset"
                             ${sqlBody}`))
        ]);
        return { count: Number(count[0].count), data };
    }
    async sendDemoContactEmail(data: DemoDto) {
        await this.communicationService.createJobForBull(QueueActionOptions.SEND_DEMO_CONTACT_EMAIL, data, '@10times.com');
        return { data: { message: 'email send for demo api' } }
    }
}
