import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OthersDataService } from './others.data.service';
import { ContactUsDto, DemoContactDto, PresetDto, TrackerShareAccessDto } from './dto';
import { UserDataService } from 'src/user/user.data.service';
import { AccessDataService } from 'src/access/access.data.service';
import { blackListDomain } from 'src/utils/types';

@Injectable()
export class OthersService {
    constructor(private readonly othersDataService: OthersDataService,
        private readonly userDataService: UserDataService,
        private readonly accessDataService: AccessDataService
    ) { }
    async getPresetData(query: PresetDto) {
        try {
            const whereClause: string[] = [];
            const andWhereClause: string[] = [];
            const orWhereClause: string[] = [];
            if (query.categorySlugs) {
                andWhereClause.push(`EXISTS (
                                SELECT 1 FROM jsonb_array_elements("filterValue"->'category') AS cat 
                             WHERE cat->>'slug' IN ('${query.categorySlugs.join("','")}')
             )`);
            }
            if (query.countryIds) {
                andWhereClause.push(`EXISTS (
                                SELECT 1 FROM jsonb_array_elements("filterValue"->'country') AS cat 
                             WHERE cat->>'code' IN ('${query.countryIds.join("','")}') OR 
                              cat->>'id' IN ('${query.countryIds.join("','")}')
             )`);
            }
            if (query.deleted) {
                andWhereClause.push(` deleted = ${query.deleted}`);
            }
            if (query.presetId) {
                andWhereClause.push(` id = '${query.presetId}'`);
            }
            if (query.keywords) {
                andWhereClause.push(`(name ILIKE '%${query.keywords}%' OR keywords ILIKE '%${query.keywords}%')`);
            }
            if (query.newEventCount) {
                andWhereClause.push(`"newEventCount" >= ${query.newEventCount.start} AND "newEventCount" <= ${query.newEventCount.end}`);
            }
            if (query.totalEvent) {
                andWhereClause.push(`"totalEvent" >= ${query.totalEvent.start} AND "totalEvent" <= ${query.totalEvent.end}`);
            }
            if (query.rank) {
                andWhereClause.push(`
                      CAST("filterValue"->'rank'->>'start' AS INTEGER) = ${query.rank.start}
        AND CAST("filterValue"->'rank'->>'end' AS INTEGER) <= ${query.rank.end}  
                    `);
            }
            if (query.trackerType) {
                andWhereClause.push(` EXISTS (
            SELECT 1 FROM unnest("trackerType") AS t 
            WHERE t IN ('${query.trackerType.join("','")}')
        )`);
            }
            if (andWhereClause.length > 0) {
                whereClause.push(`WHERE ${andWhereClause.join(" AND ")}`);
            }
            whereClause.push(`ORDER BY "${query.sortBy}" ${query.sortAs}`);
            whereClause.push(` limit ${query.limit} offset ${query.offset}`);
            return await this.othersDataService.getPresetData(whereClause.join(' '));
        } catch (error) {
            console.error(error);
            throw new HttpException('Something went wrong', HttpStatus.BAD_REQUEST);
        }
    }
    async sendDemoContactEmail(source: 'demoContact' | 'contactUs', data: DemoContactDto |
        ContactUsDto) {
        const [dailyLimit, userLimit] = await Promise.all([
            this.othersDataService.checkDailyLimitForContact(),
            this.othersDataService.checkUserLimitForContact(data.email),
        ]);
        const dailyCount = Number(dailyLimit[0]?.count ?? 0);
        const userCount = Number(userLimit[0]?.count ?? 0);

        if (dailyCount >= 500 || userCount >= 5) {
            const userForBull = await this.othersDataService.createOrGetBullUser();
            const bulluserLimit = await this.othersDataService.checkUserLimitForContact(userForBull.email);
            const bullCount = Number(bulluserLimit[0]?.count ?? 0);
            if (1 > bullCount && dailyCount >= 500) {
                const upsert = await this.othersDataService.upsertContactEnquiry({
                    firstName: userForBull.firstname,
                    lastName: userForBull.lastname,
                    email: userForBull.email,
                    subscribe: (data as DemoContactDto).subscribe === 'true' ? true : false,
                    sourceModule: 'ERROR',
                    data: data,
                });
                await this.othersDataService.sendDemoContactErrorEmail({
                    email: data.email,
                    userLimit: String(userCount),
                    dailyLimit: String(dailyCount),
                    time: (new Date()).toUTCString(),
                    name: data.firstName + ' ' + data.lastName,
                }, upsert.id);
            }
            throw new HttpException(
                'Too many requests — please try again tomorrow.',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
        const sourceId = (await this.othersDataService.createContactEnquiry({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            subscribe: (data as DemoContactDto).subscribe === 'true' ? true : false,
            sourceModule: source === 'contactUs' ? 'CONTACT_US' : 'DEMO',
            data: data,
        })).id
        return await this.othersDataService.sendDemoContactEmail(source, data, sourceId);
    }
    async createTrackerAccess(body: TrackerShareAccessDto) {
        const domain: string = body.accessReceiverEmail.split('@')[1];
        if (domain && blackListDomain.includes(domain)) {
            throw new HttpException(
                'Can not invite user to this account',
                HttpStatus.BAD_REQUEST,
            );
        }
        const userdataArray = await this.userDataService.getUsers({ email: [body.accessReceiverEmail], limit: 1, offset: 0 });
        // console.log(userdataArray);
        const userData = userdataArray[0]
        const dataOfAccessArray = await this.accessDataService.getAccess({ limit: 1, offset: 0, sourceEntity: 'TRACKER', accessTypes: ['SUPER_ADMIN'] });
        const dataOfAccess = dataOfAccessArray[0];
        // console.log(dataOfAccess);
        const dataOfAccessExistArray = await this.accessDataService.getAccess({ limit: 1, offset: 0, sourceEntity: 'TRACKER', sourceEntityId: body.trackerId, accessTypes: ['ADMIN'], accessReceiverId: userData.id });
        if (dataOfAccessExistArray.length > 0) {
            throw new HttpException(
                'access is already provided.',
                HttpStatus.BAD_REQUEST,
            );
        }
        if ((body.accessReceiverEmail === (dataOfAccess.accessProvider.email))
        ) {
            throw new HttpException(
                'Can not invite yourself',
                HttpStatus.BAD_REQUEST,
            );
        }
        if (dataOfAccess.accessProviderId !== dataOfAccess.accessProviderId) {
            throw new HttpException(
                'access not found',
                HttpStatus.BAD_REQUEST,
            );
        }
        const createAccess = await this.accessDataService.createAccess({
            accessProviderId: dataOfAccess.accessProviderId, accessType: 'ADMIN',
            accountId: dataOfAccess.accountId || '', flagForEmail: false, sourceEntity: 'TRACKER',
            sourceEntityId: body.trackerId, accessReceiverId: userData.id
        });
        return { data: { message: 'access created', createAccess } }
    }
}
