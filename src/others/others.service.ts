import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OthersDataService } from './others.data.service';
import { DemoDto, PresetDto } from './dto';

@Injectable()
export class OthersService {
    constructor(private readonly othersDataService: OthersDataService) { }
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
    async sendDemoContactEmail(data: DemoDto) {
        return await this.othersDataService.sendDemoContactEmail(data);
    }
}
