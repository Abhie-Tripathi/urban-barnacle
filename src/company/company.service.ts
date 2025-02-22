import { Injectable } from '@nestjs/common';
import { ProspectSchemaDto } from 'src/shared/shared.dto';
import { SharedService } from 'src/shared/shared.service';
import { decrypt, encrypt } from 'src/utils';
import { microserviceEndpoints } from 'src/utils/endpoints';
import { TCachedUser } from 'src/utils/types';

@Injectable()
export class CompanyService {
    constructor(
        private readonly sharedService: SharedService,
    ) { }
    async getCompanyProspectData(query: ProspectSchemaDto, viewAs: string) {
        return await this.sharedService.getCompanyAndUserDataForProspect(query, viewAs, 'company');
    }
    async getCompnayEvents(companyId: string, query, userData: TCachedUser) {
        if ((query.limit) > 20) {
            query.limit = 20;
        }
        companyId = decrypt(companyId).replace(process.env.TEN_TIMES_ID_ENCRYPT_KEY as string, '');
        const baseURL = process.env.MICROSERVICE_URL || '';
        const endpoint = microserviceEndpoints.company.events;
        const queryString = new URLSearchParams(query).toString();
        const url = `${baseURL}${endpoint}/${companyId}?${queryString}`;
        const response = await fetch(url, {
            method: 'GET',
        });
        const data = await response.json();
        console.log(data);

        return data;

    }
    async getCompanyPoc(companyId: string) {
        companyId = decrypt(companyId).replace(
            process.env.TEN_TIMES_ID_ENCRYPT_KEY as string,
            '',
        );
        const baseURL = process.env.MICROSERVICE_URL || '';
        const endpoint = microserviceEndpoints.company.poc;
        // const queryString = new URLSearchParams(query).toString();
        const url = `${baseURL}${endpoint}/${companyId}`;
        const response = await fetch(url, {
            method: 'GET',
        });

        // if (!response.ok) {
        //   throw new Error(`Error fetching categories: ${response.statusText}`);
        // }

        const data = await response.json();
        console.log(data);

        return {
            data: {
                companyPoc: data.data.companyPoc.map((val) => {
                    return { ...val, id: encrypt(val.id + process.env.TEN_TIMES_ID_ENCRYPT_KEY as string) };
                }),
            },
        };

    }
}
